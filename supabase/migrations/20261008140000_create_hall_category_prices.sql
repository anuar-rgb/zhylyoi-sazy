-- =====================================================================
-- hall_category_prices — цены зала по умолчанию для каждой категории мест
--
-- Зал задаёт, мероприятие меняет. В зале отмечают VIP-места (hall_seats.category)
-- и ставят цену для каждой категории здесь. Когда мероприятию назначают зал,
-- приложение копирует ему эти места и цены (event_seat_categories и
-- event_ticket_types), и дальше у мероприятия они свои: правка цены в зале не
-- меняет уже созданные мероприятия, пока сотрудник сам не нажмёт у мероприятия
-- «Взять места и цены из зала».
--
-- price = 0 — бесплатно для этой категории.
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

create table if not exists public.hall_category_prices (
  hall_id    uuid not null references public.halls(id) on delete cascade,
  category   text not null,
  price      numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (hall_id, category),
  constraint chk_hall_category_prices_price check (price >= 0)
);

comment on table public.hall_category_prices is
  'Цена зала по умолчанию для категории мест. Копируется в event_ticket_types, когда мероприятию назначают зал.';

drop trigger if exists trg_hall_category_prices_updated_at on public.hall_category_prices;
create trigger trg_hall_category_prices_updated_at
  before update on public.hall_category_prices
  for each row execute function public.set_updated_at();

-- Только сотрудникам: покупатель видит цены мероприятия, а не зала.
revoke all on public.hall_category_prices from anon;
revoke all on public.hall_category_prices from authenticated;
grant select, insert, update, delete on public.hall_category_prices to authenticated;

alter table public.hall_category_prices enable row level security;

-- Своего organization_id нет — проверка через зал, как у hall_seats.
drop policy if exists hall_category_prices_staff_all on public.hall_category_prices;
create policy hall_category_prices_staff_all on public.hall_category_prices
  for all to authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_category_prices.hall_id and public.is_staff_of(h.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.halls h
      where h.id = hall_category_prices.hall_id and public.is_staff_of(h.organization_id)
    )
  );

commit;
