-- =====================================================================
-- bookings, booking_items — Фаза 3 продажи билетов: бронь без оплаты
--
-- Даёт рабочий продукт для бесплатных мероприятий уже сейчас. Платная
-- бронь корректно создаётся и держит место 15 минут, но оплата и QR —
-- следующая фаза. payment_providers/organization_payment_methods,
-- QR-сканер на входе, culture_clubs, culture_news эта миграция не
-- трогает.
--
-- РЕШЕНИЕ ПО ДОСТУПУ ANON (обсуждено с пользователем перед миграцией):
-- anon НЕ получает прямой INSERT на bookings/booking_items. Вся логика
-- (расчёт суммы из event_ticket_types, "ленивое" истечение просроченных
-- броней, атомарная вставка всех выбранных мест) живёт в функции
-- create_booking() — anon получает только EXECUTE на неё. Причина:
-- голый INSERT — это одна строка без проверок; если бы anon мог писать
-- в таблицы напрямую, ничто не мешало бы вставить total_amount=0 в
-- обход цены или бронь без проверки занятости места. Функция считает
-- сумму и проверяет места сама, минуя доверие к тому, что прислал клиент.
-- =====================================================================

begin;

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.culture_events(id) on delete cascade,
  -- Дублирует culture_events.organization_id: RLS и индекс проверяют
  -- организацию на каждый запрос, JOIN через event на каждую политику
  -- был бы лишней ценой при том, что событие сменить организацию не может.
  organization_id uuid not null references public.organizations(id) on delete cascade,

  buyer_name      text not null,
  buyer_phone     text not null,

  status          text not null default 'pending'
                    check (status in ('pending','confirmed','cancelled','expired')),
  total_amount    numeric(10,2) not null default 0,

  access_token    uuid not null default gen_random_uuid(),
  -- NULL для confirmed/бесплатных — подтверждённую бронь не нужно
  -- истекать, место уже закреплено окончательно.
  expires_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.bookings is
  'Заявка на бронь мест. "paid" сюда не входит — оплаты ещё нет, confirmed покрывает бесплатную бронь.';
comment on column public.bookings.access_token is
  'Непоследовательный uuid — единственный ключ доступа гостя к своей брони через get_booking_by_token. Обычный SELECT anon не даётся вообще.';

create unique index if not exists uq_bookings_access_token on public.bookings (access_token);
create index if not exists idx_bookings_event_id on public.bookings (event_id);
create index if not exists idx_bookings_organization_id on public.bookings (organization_id);
-- Ускоряет expire_stale_bookings_for_event: именно pending с истёкшим сроком ищутся чаще всего.
create index if not exists idx_bookings_pending_expiry on public.bookings (event_id, expires_at) where status = 'pending';

create table if not exists public.booking_items (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  -- Дублирует bookings.event_id — нужно для партиционирования частичного
  -- уникального индекса ниже без JOIN на bookings при каждой вставке.
  event_id          uuid not null references public.culture_events(id) on delete cascade,
  seat_id           uuid not null references public.hall_seats(id),
  ticket_type_id    uuid not null references public.event_ticket_types(id),

  price_at_booking  numeric(10,2) not null,
  -- Будущее содержимое QR — не выдаётся гостю в этой фазе, только хранится.
  ticket_code       uuid not null default gen_random_uuid(),

  checked_in_at     timestamptz,
  -- Проставляется при отмене/истечении брони — место снова свободно.
  released_at       timestamptz,

  created_at        timestamptz not null default now()
);

comment on table public.booking_items is
  'Одно место внутри брони. released_at not null — место снова свободно, строка остаётся как история.';
comment on column public.booking_items.checked_in_at is
  'Заполняется в фазе QR-сканера на входе. Здесь всегда NULL.';

-- Защита от двойной продажи: одно активное место на мероприятие, вне
-- зависимости от того, к какой брони оно относится.
create unique index if not exists uq_seat_per_event_active
  on public.booking_items (event_id, seat_id)
  where released_at is null;

create index if not exists idx_booking_items_booking_id on public.booking_items (booking_id);
create index if not exists idx_booking_items_event_active on public.booking_items (event_id) where released_at is null;

-- ---------------------------------------------------------------------
-- expire_stale_booking — истекает ОДНУ бронь, если она pending и
-- просрочена. Идемпотентна: вызов на уже истёкшей/подтверждённой
-- броне ничего не меняет.
-- ---------------------------------------------------------------------
create or replace function public.expire_stale_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  update public.bookings
  set status = 'expired', updated_at = now()
  where id = p_booking_id
    and status = 'pending'
    and expires_at is not null
    and expires_at < now();

  update public.booking_items
  set released_at = now()
  where booking_id = p_booking_id
    and released_at is null
    and exists (
      select 1 from public.bookings b
      where b.id = p_booking_id and b.status = 'expired'
    );
end;
$fn$;

-- ---------------------------------------------------------------------
-- expire_stale_bookings_for_event — обёртка над expire_stale_booking
-- для случая "проверить занятость мест на мероприятие": находит все
-- просроченные pending этого события и истекает их по одной.
-- Вызывается и из create_booking (перед проверкой мест), и при чтении
-- публичной схемы мест — иначе зависшая просроченная бронь визуально
-- держала бы место занятым до первой попытки его купить.
-- ---------------------------------------------------------------------
create or replace function public.expire_stale_bookings_for_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.bookings
    where event_id = p_event_id and status = 'pending' and expires_at < now()
  loop
    perform public.expire_stale_booking(v_id);
  end loop;
end;
$fn$;

-- ---------------------------------------------------------------------
-- get_taken_seats — какие места сейчас недоступны для мероприятия.
-- anon не имеет SELECT на booking_items (там ticket_code — секрет
-- будущего QR), поэтому публичная схема мест узнаёт занятость только
-- через эту функцию, которая отдаёт исключительно seat_id.
-- ---------------------------------------------------------------------
create or replace function public.get_taken_seats(p_event_id uuid)
returns table (seat_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform public.expire_stale_bookings_for_event(p_event_id);

  return query
    select bi.seat_id
    from public.booking_items bi
    where bi.event_id = p_event_id and bi.released_at is null;
end;
$fn$;

-- ---------------------------------------------------------------------
-- get_booking_by_token — статус брони гостю без логина, только по
-- access_token (uuid, непоследовательный). Обычный RLS SELECT на
-- bookings anon не даёт вообще — единственный путь сюда.
-- Плоские строки (одна на место в брони), а не вложенный JSON — проще
-- принять на стороне supabase-js как обычный массив из .rpc().
-- ---------------------------------------------------------------------
create or replace function public.get_booking_by_token(p_token uuid)
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
  released_at       timestamptz
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
      tt.name_kk, tt.name_ru, bi.price_at_booking, bi.ticket_code, bi.released_at
    from public.bookings b
    left join public.booking_items bi on bi.booking_id = b.id
    left join public.hall_seats hs on hs.id = bi.seat_id
    left join public.event_ticket_types tt on tt.id = bi.ticket_type_id
    where b.id = v_booking_id
    order by hs.row_label, hs.seat_number;
end;
$fn$;

-- ---------------------------------------------------------------------
-- create_booking — вся транзакция создания брони. Один вызов = одна
-- транзакция: истечение просроченных, расчёт суммы, вставка bookings,
-- одна multi-row вставка booking_items. Любой конфликт (место занято
-- секунду назад — unique_violation на uq_seat_per_event_active)
-- откатывает всё целиком, включая уже вставленную строку bookings.
--
-- Цена берётся из event_ticket_types по категории места — с клиента
-- принимаются только id мест, никогда цена или сумма.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_event_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_seat_ids uuid[]
)
returns table (
  booking_id uuid,
  access_token uuid,
  status text,
  total_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_org_id uuid;
  v_hall_id uuid;
  v_booking_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_total numeric(10,2);
  v_status text;
  v_expires_at timestamptz;
  v_requested_count int;
  v_priced_count int;
begin
  if p_seat_ids is null or array_length(p_seat_ids, 1) is null then
    raise exception 'no_seats_selected' using errcode = '22023';
  end if;
  if trim(coalesce(p_buyer_name, '')) = '' or trim(coalesce(p_buyer_phone, '')) = '' then
    raise exception 'missing_buyer_info' using errcode = '22023';
  end if;

  select organization_id, hall_id into v_org_id, v_hall_id
  from public.culture_events where id = p_event_id;

  if v_org_id is null then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_hall_id is null then
    raise exception 'event_has_no_hall' using errcode = '22023';
  end if;

  -- Free this event's seats from any booking whose hold already lapsed,
  -- before checking what is actually available.
  perform public.expire_stale_bookings_for_event(p_event_id);

  v_requested_count := array_length(p_seat_ids, 1);

  select count(*), coalesce(sum(tt.price), 0)
  into v_priced_count, v_total
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id and hs.hall_id = v_hall_id and hs.is_active = true
  join public.event_ticket_types tt on tt.event_id = p_event_id and tt.category = hs.category and tt.is_active = true;

  -- Every requested seat must resolve to a priced, active ticket type in this
  -- hall — silently dropping one would reserve fewer seats than the guest asked
  -- for and charge them for the wrong count.
  if v_priced_count <> v_requested_count then
    raise exception 'seat_not_available' using errcode = '22023';
  end if;

  if v_total = 0 then
    v_status := 'confirmed';
    v_expires_at := null;
  else
    v_status := 'pending';
    v_expires_at := now() + interval '15 minutes';
  end if;

  insert into public.bookings (event_id, organization_id, buyer_name, buyer_phone, status, total_amount, access_token, expires_at)
  values (p_event_id, v_org_id, trim(p_buyer_name), trim(p_buyer_phone), v_status, v_total, v_access_token, v_expires_at)
  returning id into v_booking_id;

  -- One statement for every seat: a unique_violation on any single row aborts
  -- the whole insert (and, being in the same function invocation, the bookings
  -- row above too), instead of leaving a booking with half its seats.
  insert into public.booking_items (booking_id, event_id, seat_id, ticket_type_id, price_at_booking)
  select v_booking_id, p_event_id, hs.id, tt.id, tt.price
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id
  join public.event_ticket_types tt on tt.event_id = p_event_id and tt.category = hs.category and tt.is_active = true;

  return query select v_booking_id, v_access_token, v_status, v_total;
end;
$fn$;

-- ---------------------------------------------------------------------
-- Права на функции. Внутренние вызовы (expire_stale_booking изнутри
-- expire_stale_bookings_for_event, изнутри create_booking/
-- get_booking_by_token/get_taken_seats) выполняются с правами
-- определившей их роли благодаря SECURITY DEFINER и не нуждаются в
-- отдельном EXECUTE для вызывающей роли — поэтому оба вспомогательных
-- истекателя вообще не выдаются наружу.
-- ---------------------------------------------------------------------
revoke all on function public.expire_stale_booking(uuid) from public;
revoke all on function public.expire_stale_bookings_for_event(uuid) from public;

revoke all on function public.get_taken_seats(uuid) from public;
grant execute on function public.get_taken_seats(uuid) to anon, authenticated;

revoke all on function public.get_booking_by_token(uuid) from public;
grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;

revoke all on function public.create_booking(uuid, text, text, uuid[]) from public;
grant execute on function public.create_booking(uuid, text, text, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Права на уровне таблиц. Никакого прямого INSERT для anon — создание
-- брони идёт только через create_booking (SECURITY DEFINER пишет в обход
-- этих грантов). authenticated получает только SELECT: полноценная
-- админ-панель просмотра/отмены броней — отдельный, более поздний шаг,
-- сейчас важно только заложить видимость в RLS.
-- ---------------------------------------------------------------------
revoke all on public.bookings from anon;
revoke all on public.bookings from authenticated;
grant select on public.bookings to authenticated;

revoke all on public.booking_items from anon;
revoke all on public.booking_items from authenticated;
grant select on public.booking_items to authenticated;

alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;

-- Никакой anon-политики SELECT — единственный путь для гостя это
-- get_booking_by_token, которая обходит RLS через SECURITY DEFINER.
drop policy if exists bookings_staff_read on public.bookings;
create policy bookings_staff_read on public.bookings
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists booking_items_staff_read on public.booking_items;
create policy booking_items_staff_read on public.booking_items
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id and public.is_staff_of(b.organization_id)
    )
  );

commit;

-- ---------------------------------------------------------------------
-- Проверка (выполнять отдельно, ничего не меняет)
-- ---------------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name in ('bookings','booking_items')
-- order by table_name, ordinal_position;
