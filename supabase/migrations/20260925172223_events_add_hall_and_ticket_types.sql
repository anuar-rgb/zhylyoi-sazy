-- =====================================================================
-- culture_events.hall_id, event_ticket_types — Фаза 2 продажи билетов
--
-- Уточнено с пользователем перед миграцией: отдельной таблицы "events"
-- в базе больше нет — она была переименована в culture_events ещё в
-- этой сессии и уже полноценно используется (organization_id, seeded-
-- данные, рабочий CRUD на /admin/culture-events, публичные страницы
-- /afisha). Внешний ключ event_ticket_types.event_id ссылается именно
-- на culture_events(id).
--
-- Брони и оплаты здесь нет — только цена по категории места для
-- мероприятия. culture_clubs, culture_news, halls/hall_seats (кроме
-- добавления hall_id сюда), payment_providers/
-- organization_payment_methods эта миграция не трогает.
-- =====================================================================

begin;

-- Nullable: мероприятие может быть без зала вообще (например, на улице,
-- без билетов). on delete set null — исчезновение зала не должно уносить
-- за собой мероприятие.
alter table public.culture_events
  add column if not exists hall_id uuid references public.halls(id) on delete set null;

comment on column public.culture_events.hall_id is
  'Зал, где проходит мероприятие. NULL — без зала (билетов/мест для него не будет).';

create index if not exists idx_culture_events_hall_id on public.culture_events (hall_id);

create table if not exists public.event_ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.culture_events(id) on delete cascade,

  -- Совпадает по значению с hall_seats.category, но без FK: категория в
  -- hall_seats — свободный текст, соответствие проверяется в приложении
  -- (админка предлагает только категории, реально существующие в зале
  -- мероприятия), а не ограничением базы.
  category    text not null,

  name_kk     text,
  name_ru     text,

  price       numeric(10,2) not null default 0,
  is_free     boolean not null default false,
  currency    text not null default 'KZT',
  is_active   boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint uq_event_ticket_types_category unique (event_id, category),
  constraint chk_event_ticket_types_price check (
    (is_free and price = 0) or (not is_free and price > 0)
  )
);

comment on table public.event_ticket_types is
  'Цена по категории мест для одного мероприятия. Ни брони, ни билета покупателя здесь нет — это Фаза 3.';
comment on column public.event_ticket_types.category is
  'Свободный текст, как hall_seats.category. Совпадение проверяет приложение при создании, не БД.';

create index if not exists idx_event_ticket_types_event_id on public.event_ticket_types (event_id);

revoke all on public.event_ticket_types from anon;
revoke all on public.event_ticket_types from authenticated;
grant select on public.event_ticket_types to anon;
grant select, insert, update, delete on public.event_ticket_types to authenticated;

alter table public.event_ticket_types enable row level security;

drop policy if exists event_ticket_types_public_read on public.event_ticket_types;
create policy event_ticket_types_public_read on public.event_ticket_types
  for select to anon, authenticated
  using (is_active = true);

-- Staff also need to see their own deactivated ticket types to manage them (turn
-- them back on, or just see them listed) — the same shape as halls_staff_read
-- alongside halls_public_read.
drop policy if exists event_ticket_types_staff_read on public.event_ticket_types;
create policy event_ticket_types_staff_read on public.event_ticket_types
  for select to authenticated
  using (
    exists (
      select 1 from public.culture_events e
      where e.id = event_ticket_types.event_id and public.is_staff_of(e.organization_id)
    )
  );

-- event_ticket_types has no organization_id of its own — every write check joins
-- through culture_events, the same way hall_seats joins through halls.
drop policy if exists event_ticket_types_staff_write on public.event_ticket_types;
create policy event_ticket_types_staff_write on public.event_ticket_types
  for all to authenticated
  using (
    exists (
      select 1 from public.culture_events e
      where e.id = event_ticket_types.event_id and public.is_staff_of(e.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.culture_events e
      where e.id = event_ticket_types.event_id and public.is_staff_of(e.organization_id)
    )
  );

commit;

-- ---------------------------------------------------------------------
-- Проверка (выполнять отдельно, ничего не меняет)
-- ---------------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name='event_ticket_types'
-- order by ordinal_position;
