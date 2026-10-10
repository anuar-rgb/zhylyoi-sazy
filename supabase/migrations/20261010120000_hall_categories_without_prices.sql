-- =====================================================================
-- hall_categories — категории мест зала, без цен
--
-- Зал задаёт только категории мест (Стандарт, VIP, свои) и какие места к ним
-- относятся. Цены у зала больше нет: цену каждой категории ставят у
-- мероприятия (event_ticket_types), так один зал служит разным концертам с
-- разными ценами.
--
-- Здесь хранятся свои категории зала, даже пока ни одному месту они не
-- назначены (например, «Ложа» сразу после добавления). Категории, которые уже
-- есть у мест, видны и без строки здесь.
--
-- Заменяет hall_category_prices: её категории переносятся сюда, цены
-- отбрасываются. Цены, уже скопированные в мероприятия, остаются у них.
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

create table if not exists public.hall_categories (
  hall_id    uuid not null references public.halls(id) on delete cascade,
  category   text not null,
  created_at timestamptz not null default now(),
  primary key (hall_id, category),
  constraint chk_hall_categories_category check (length(trim(category)) between 1 and 40)
);

comment on table public.hall_categories is
  'Свои категории мест зала (без цен). Цены задаёт мероприятие в event_ticket_types.';

-- Только сотрудникам.
revoke all on public.hall_categories from anon;
revoke all on public.hall_categories from authenticated;
grant select, insert, update, delete on public.hall_categories to authenticated;

alter table public.hall_categories enable row level security;

-- Своего organization_id нет — проверка через зал, как у hall_seats.
drop policy if exists hall_categories_staff_all on public.hall_categories;
create policy hall_categories_staff_all on public.hall_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_categories.hall_id and public.is_staff_of(h.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.halls h
      where h.id = hall_categories.hall_id and public.is_staff_of(h.organization_id)
    )
  );

-- Перенос категорий из старой таблицы цен, если она ещё есть.
do $$
begin
  if to_regclass('public.hall_category_prices') is not null then
    insert into public.hall_categories (hall_id, category)
    select hall_id, category from public.hall_category_prices
    where category not in ('standard', 'vip')
    on conflict do nothing;

    drop table public.hall_category_prices;
  end if;
end $$;

commit;
