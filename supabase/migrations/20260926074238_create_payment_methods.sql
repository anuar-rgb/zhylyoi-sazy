-- =====================================================================
-- create_payment_methods — Фаза 4a: абстракция способов оплаты
--
-- Даёт организации статический QR (Kaspi/Halyk) на /my-ticket/[token]
-- для платной pending-брони и кнопку "подтвердить оплату" в админке.
-- API-интеграции с банками — НЕ в этой фазе, только структура под них
-- (organization_payment_secrets, mode='manual'|'api').
--
-- Не трогает: culture_clubs, culture_events (кроме чтения через
-- get_booking_by_token), halls/hall_seats, event_ticket_types,
-- create_booking.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. payment_providers — платформенный справочник, не привязан к org
-- ---------------------------------------------------------------------
create table public.payment_providers (
  code text primary key,
  name text not null,
  integration_type text not null check (integration_type in ('api_webhook','static_qr_manual'))
);

insert into public.payment_providers (code, name, integration_type) values
  ('halyk_epay', 'Halyk Epay', 'static_qr_manual'),
  ('kaspi_pay', 'Kaspi Pay', 'static_qr_manual');

revoke all on public.payment_providers from anon;
revoke all on public.payment_providers from authenticated;
grant select on public.payment_providers to anon, authenticated;

alter table public.payment_providers enable row level security;

-- Просто список названий провайдеров, ничего чувствительного — нужен
-- на публичной /my-ticket странице как запасное название, если
-- организация не задала своё display_name.
create policy payment_providers_public_read on public.payment_providers
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 2. organization_payment_methods
-- ---------------------------------------------------------------------
create table public.organization_payment_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_code text not null references public.payment_providers(code),
  display_name_kk text,
  display_name_ru text,
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  static_qr_image_url text,
  static_qr_image_path text,
  -- Задел на Фазу 4b: 'manual' — сотрудник подтверждает сам, 'api' — вебхук банка.
  mode text not null default 'manual' check (mode in ('manual','api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_code)
);

-- Не более одного способа оплаты "по умолчанию" на организацию.
create unique index uq_org_payment_default
  on public.organization_payment_methods (organization_id)
  where is_default = true;

create trigger trg_organization_payment_methods_updated_at
  before update on public.organization_payment_methods
  for each row execute function public.set_updated_at();

revoke all on public.organization_payment_methods from anon;
revoke all on public.organization_payment_methods from authenticated;
grant select on public.organization_payment_methods to anon, authenticated;
grant insert, update, delete on public.organization_payment_methods to authenticated;

alter table public.organization_payment_methods enable row level security;

-- anon видит только включённые способы оплаты (для /my-ticket).
create policy organization_payment_methods_public_read on public.organization_payment_methods
  for select to anon, authenticated
  using (is_enabled = true);

-- Сотрудник видит все способы оплаты СВОЕЙ организации, включая выключенные
-- (чтобы включить обратно в админке).
create policy organization_payment_methods_staff_read on public.organization_payment_methods
  for select to authenticated
  using (public.is_staff_of(organization_id));

create policy organization_payment_methods_staff_write on public.organization_payment_methods
  for all to authenticated
  using (public.is_staff_of(organization_id))
  with check (public.is_staff_of(organization_id));

-- ---------------------------------------------------------------------
-- 3. bookings: confirmed_at / confirmed_by + право сотрудника подтвердить оплату
-- ---------------------------------------------------------------------
alter table public.bookings
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references public.profiles(id);

-- Колоночный grant: сотрудник физически не может через UPDATE тронуть
-- buyer_name/total_amount/access_token, даже если серверный код когда-то
-- обойдётся или изменится.
grant update (status, confirmed_at, confirmed_by, updated_at) on public.bookings to authenticated;

-- Статус ограничен и в USING, и в WITH CHECK:
--  - USING: сотрудник не может нацелить UPDATE на уже cancelled/expired
--    бронь вообще — такая строка для него попросту не существует для апдейта.
--  - WITH CHECK: результат UPDATE не может стать чем-то за пределами
--    pending/confirmed через эту политику — переход в cancelled/expired
--    остаётся исключительно за expire_stale_booking (SECURITY DEFINER,
--    работает в обход RLS).
create policy bookings_staff_update on public.bookings
  for update to authenticated
  using (public.is_staff_of(organization_id) and status in ('pending','confirmed'))
  with check (public.is_staff_of(organization_id) and status in ('pending','confirmed'));

-- ---------------------------------------------------------------------
-- 4. organization_payment_secrets — только структура, Фаза 4b
-- ---------------------------------------------------------------------
create table public.organization_payment_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_payment_method_id uuid not null references public.organization_payment_methods(id) on delete cascade,
  vault_secret_id uuid,
  created_at timestamptz not null default now()
);

revoke all on public.organization_payment_secrets from anon;
revoke all on public.organization_payment_secrets from authenticated;

alter table public.organization_payment_secrets enable row level security;
-- Ни одной политики — полный дефолт-запрет для anon и authenticated.
-- Единственный будущий доступ — через SECURITY DEFINER функцию Фазы 4b.

-- ---------------------------------------------------------------------
-- 5. get_booking_by_token: + organization_id
--    (create_booking НЕ трогаю — только эту функцию чтения)
-- ---------------------------------------------------------------------
-- RETURNS TABLE нельзя расширить через CREATE OR REPLACE без DROP —
-- Postgres отказывается менять состав OUT-параметров на лету.
drop function if exists public.get_booking_by_token(uuid);

create function public.get_booking_by_token(p_token uuid)
returns table (
  booking_id        uuid,
  status            text,
  buyer_name        text,
  buyer_phone       text,
  total_amount      numeric,
  expires_at        timestamptz,
  created_at        timestamptz,
  item_id           uuid,
  seat_id           uuid,
  row_label         text,
  seat_number       int,
  category          text,
  ticket_type_name_kk text,
  ticket_type_name_ru text,
  price_at_booking  numeric,
  ticket_code       uuid,
  released_at       timestamptz,
  organization_id   uuid
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking_id uuid;
begin
  select b.id into v_booking_id from public.bookings b where b.access_token = p_token;
  if v_booking_id is null then
    return;
  end if;

  perform public.expire_stale_booking(v_booking_id);

  return query
    select
      b.id, b.status, b.buyer_name, b.buyer_phone, b.total_amount, b.expires_at, b.created_at,
      bi.id, bi.seat_id, hs.row_label, hs.seat_number, hs.category,
      tt.name_kk, tt.name_ru, bi.price_at_booking, bi.ticket_code, bi.released_at,
      b.organization_id
    from public.bookings b
    left join public.booking_items bi on bi.booking_id = b.id
    left join public.hall_seats hs on hs.id = bi.seat_id
    left join public.event_ticket_types tt on tt.id = bi.ticket_type_id
    where b.id = v_booking_id
    order by hs.row_label, hs.seat_number;
end;
$fn$;

revoke all on function public.get_booking_by_token(uuid) from public;
grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;

commit;
