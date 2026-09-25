-- =====================================================================
-- halls, hall_seats — зал учреждения и сетка мест
--
-- Фаза 1 продажи билетов: зал → места. Без домен-префикса (culture_/
-- library_), потому что зал и места нужны любому типу учреждения
-- одинаково — это не специфика Дома культуры, как organizations сама.
--
-- Билетов, брони и оплаты здесь нет — это отдельные фазы. culture_clubs,
-- events, news, payment_providers/organization_payment_methods эта
-- миграция не трогает.
--
-- Никакого NOT NULL "name": в отличие от culture_clubs и остальных таблиц
-- контента, у зала нет служебной колонки-запасной. Этот сессионный опыт
-- (см. миграции этой недели) показал, что она маскирует недостающий
-- перевод, а не подстраховывает его — здесь её нет с самого начала.
--
-- total_capacity на halls — денормализация: список залов в админке должен
-- показывать вместимость без JOIN на hall_seats. Триггер на hall_seats
-- пересчитывает её при любом insert/update/delete, так что колонка не
-- может разойтись с реальным числом активных мест ни при работе через
-- форму, ни через SQL-редактор.
-- =====================================================================

begin;

create table if not exists public.halls (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  name_kk         text,
  name_ru         text,

  total_capacity  integer not null default 0,
  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.halls is
  'Зал учреждения. total_capacity считается триггером с hall_seats, руками не пишется.';
comment on column public.halls.total_capacity is
  'Число активных (is_active = true) мест в зале. Поддерживается триггером trg_hall_seats_recalc_capacity — прямая правка потеряется при следующем изменении hall_seats.';

create table if not exists public.hall_seats (
  id          uuid primary key default gen_random_uuid(),
  hall_id     uuid not null references public.halls(id) on delete cascade,

  row_label   text not null,
  seat_number integer not null,
  category    text not null default 'standard',
  is_active   boolean not null default true,

  created_at  timestamptz not null default now(),

  constraint uq_hall_seats_position unique (hall_id, row_label, seat_number)
);

comment on table public.hall_seats is
  'Одно место в зале. is_active = false — место технически недоступно (проход, сломанное кресло), запись не удаляется.';
comment on column public.hall_seats.row_label is
  'Буква или число ряда как текст — в залах бывает нечисловая разметка («Партер-3»).';
comment on column public.hall_seats.category is
  'Свободный текст на этом этапе: standard, vip, другое. CHECK нет намеренно — как у culture_repertoire.category.';

create index if not exists idx_halls_organization_id on public.halls (organization_id);
create index if not exists idx_halls_is_active on public.halls (is_active);
create index if not exists idx_hall_seats_hall_id on public.hall_seats (hall_id);

-- ---------------------------------------------------------------------
-- Триггер: total_capacity всегда равен числу активных мест зала.
-- SECURITY DEFINER — по той же причине, что у is_staff_of и соседей:
-- обновление halls не должно зависеть от того, есть ли у вызывающей
-- роли отдельное право UPDATE именно на эту строку halls в этот момент.
-- ---------------------------------------------------------------------
create or replace function public.recalc_hall_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  target_hall uuid := coalesce(new.hall_id, old.hall_id);
begin
  update public.halls
  set total_capacity = (
    select count(*) from public.hall_seats
    where hall_id = target_hall and is_active = true
  )
  where id = target_hall;
  return coalesce(new, old);
end;
$fn$;

revoke all on function public.recalc_hall_capacity() from public;

drop trigger if exists trg_hall_seats_recalc_capacity on public.hall_seats;
create trigger trg_hall_seats_recalc_capacity
  after insert or update or delete on public.hall_seats
  for each row execute function public.recalc_hall_capacity();

-- ---------------------------------------------------------------------
-- Права на уровне таблиц — Supabase выдаёт anon/authenticated все права
-- по умолчанию на новую таблицу, включая TRUNCATE, который RLS не
-- ограничивает. revoke ... from public этого не снимает.
-- ---------------------------------------------------------------------
revoke all on public.halls from anon;
revoke all on public.halls from authenticated;
grant select on public.halls to anon;
grant select, insert, update, delete on public.halls to authenticated;

revoke all on public.hall_seats from anon;
revoke all on public.hall_seats from authenticated;
grant select on public.hall_seats to anon;
grant select, insert, update, delete on public.hall_seats to authenticated;

alter table public.halls enable row level security;
alter table public.hall_seats enable row level security;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
drop policy if exists halls_public_read on public.halls;
create policy halls_public_read on public.halls
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists halls_staff_read on public.halls;
create policy halls_staff_read on public.halls
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists halls_staff_write on public.halls;
create policy halls_staff_write on public.halls
  for all to authenticated
  using (public.is_staff_of(organization_id))
  with check (public.is_staff_of(organization_id));

-- hall_seats has no organization_id of its own — every check joins to halls.
drop policy if exists hall_seats_public_read on public.hall_seats;
create policy hall_seats_public_read on public.hall_seats
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_seats.hall_id and h.is_active = true
    )
  );

drop policy if exists hall_seats_staff_read on public.hall_seats;
create policy hall_seats_staff_read on public.hall_seats
  for select to authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_seats.hall_id and public.is_staff_of(h.organization_id)
    )
  );

drop policy if exists hall_seats_staff_write on public.hall_seats;
create policy hall_seats_staff_write on public.hall_seats
  for all to authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_seats.hall_id and public.is_staff_of(h.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.halls h
      where h.id = hall_seats.hall_id and public.is_staff_of(h.organization_id)
    )
  );

commit;

-- ---------------------------------------------------------------------
-- Проверка (выполнять отдельно, ничего не меняет)
-- ---------------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name in ('halls','hall_seats')
-- order by table_name, ordinal_position;
