-- =====================================================================
-- Ручная проверка оплаты кассиром
--
-- Оплата не автоматическая: посетитель платит по ссылке/QR учреждения,
-- кассир сам находит поступление в Kaspi Pay и подтверждает заказ в
-- админке. Только после этого билеты становятся действующими.
--
-- Статусы заказа (bookings.status):
--   pending          — бронь создана, ждём оплату (15 минут)
--   payment_reported — покупатель нажал «Я оплатил»; это НЕ оплата, только
--                      сигнал кассиру. Бронь истекает так же, как pending
--   confirmed        — кассир подтвердил реальное поступление
--   expired          — 15 минут прошли без подтверждения, места свободны
--   rejected         — кассир не нашёл оплату или отклонил заказ
--   late_payment     — деньги пришли после истечения брони; кассир решает:
--                      выдать билеты (если места свободны) или вернуть деньги
--   refunded         — возврат сделан вне сайта и отмечен кассиром
--   cancelled        — отменён (как и раньше)
--
-- Что меняется:
--   1. новые статусы и поля в bookings (кто, когда, номер операции Kaspi);
--   2. журнал booking_actions: каждое действие кассира и «Я оплатил»;
--   3. функции: report_booking_payment, confirm_booking_manual,
--      reject_booking, mark_booking_late, issue_late_booking,
--      mark_booking_refunded — все проверки внутри, в одной транзакции;
--   4. сотрудник больше не меняет bookings напрямую, только через функции;
--   5. просроченная бронь снимается и для payment_reported;
--   6. get_booking_by_token отдаёт номер заказа, время «Я оплатил», а код
--      билета — только у подтверждённого заказа;
--   7. create_booking снова берёт цену по категории места В МЕРОПРИЯТИИ
--      (event_seat_categories), а не в зале: миграция 20261003134940
--      случайно откатила это.
--
-- Коды билетов (booking_items.ticket_code) выпускаются заново в момент
-- подтверждения: до оплаты действующего кода нет нигде.
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Статусы и поля
-- ---------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'payment_reported', 'confirmed', 'cancelled', 'expired', 'rejected', 'late_payment', 'refunded'));

alter table public.bookings
  add column if not exists payment_reported_at timestamptz,
  add column if not exists kaspi_operation_id text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists late_marked_at timestamptz,
  add column if not exists late_marked_by uuid references auth.users(id) on delete set null,
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_by uuid references auth.users(id) on delete set null,
  add column if not exists resolution_note text;

alter table public.bookings drop constraint if exists chk_bookings_kaspi_operation_id;
alter table public.bookings add constraint chk_bookings_kaspi_operation_id
  check (kaspi_operation_id is null or length(kaspi_operation_id) between 1 and 100);

comment on column public.bookings.payment_reported_at is 'Когда покупатель нажал «Я оплатил». Не доказательство оплаты.';
comment on column public.bookings.kaspi_operation_id is 'Номер операции Kaspi, который ввёл кассир при подтверждении.';

drop index if exists idx_bookings_pending_expiry;
create index if not exists idx_bookings_hold_expiry on public.bookings (event_id, expires_at)
  where status in ('pending', 'payment_reported');

-- ---------------------------------------------------------------------
-- 2. Журнал действий
-- ---------------------------------------------------------------------
create table if not exists public.booking_actions (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action          text not null
                    check (action in ('reported', 'confirmed', 'rejected', 'late', 'issued_late', 'refunded')),
  -- null — действие покупателя («Я оплатил»), иначе сотрудник.
  actor_id        uuid references auth.users(id) on delete set null,
  amount          numeric(10, 2),
  operation_id    text,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_booking_actions_booking on public.booking_actions (booking_id, created_at);

comment on table public.booking_actions is
  'Журнал ручной оплаты: кто и когда подтвердил, отклонил, отметил позднюю оплату или возврат. Пишется только функциями.';

revoke all on public.booking_actions from anon;
revoke all on public.booking_actions from authenticated;
grant select on public.booking_actions to authenticated;

alter table public.booking_actions enable row level security;

drop policy if exists booking_actions_staff_read on public.booking_actions;
create policy booking_actions_staff_read on public.booking_actions
  for select to authenticated
  using (public.is_staff_of(organization_id));

-- ---------------------------------------------------------------------
-- 3. Сотрудник меняет заказ только через функции ниже
-- ---------------------------------------------------------------------
drop policy if exists bookings_staff_update on public.bookings;
revoke update on public.bookings from authenticated;

-- ---------------------------------------------------------------------
-- 4. Истечение брони — и для payment_reported
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
    and status in ('pending', 'payment_reported')
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
    where event_id = p_event_id and status in ('pending', 'payment_reported') and expires_at < now()
  loop
    perform public.expire_stale_booking(v_id);
  end loop;
end;
$fn$;

revoke all on function public.expire_stale_booking(uuid) from public;
revoke all on function public.expire_stale_bookings_for_event(uuid) from public;

-- ---------------------------------------------------------------------
-- 5. Общая проверка для функций кассира: заказ своего учреждения
-- ---------------------------------------------------------------------
create or replace function public.staff_booking_for_update(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_book from public.bookings where id = p_booking_id for update;
  if v_book.id is null or not public.is_staff_of(v_book.organization_id) then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;
  return v_book;
end;
$fn$;

revoke all on function public.staff_booking_for_update(uuid) from public;

-- ---------------------------------------------------------------------
-- 6. «Я оплатил» — покупатель, по секретному токену заказа
-- ---------------------------------------------------------------------
create or replace function public.report_booking_payment(p_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
begin
  select * into v_book from public.bookings where access_token = p_token for update;
  if v_book.id is null then
    return 'not_found';
  end if;

  perform public.expire_stale_booking(v_book.id);
  select * into v_book from public.bookings where id = v_book.id;

  if v_book.status = 'payment_reported' then
    return 'already_reported';
  end if;
  if v_book.status <> 'pending' then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'payment_reported', payment_reported_at = now(), updated_at = now()
  where id = v_book.id;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount)
  values (v_book.id, v_book.organization_id, 'reported', null, v_book.total_amount);

  return 'reported';
end;
$fn$;

revoke all on function public.report_booking_payment(uuid) from public;
grant execute on function public.report_booking_payment(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. «Подтвердить оплату» — кассир. Повторное нажатие ничего не делает.
-- ---------------------------------------------------------------------
create or replace function public.confirm_booking_manual(p_booking_id uuid, p_operation_id text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_event_date timestamptz;
  v_operation text := nullif(trim(coalesce(p_operation_id, '')), '');
begin
  v_book := public.staff_booking_for_update(p_booking_id);

  if v_book.status = 'confirmed' then
    return 'already_confirmed';
  end if;
  if v_book.status not in ('pending', 'payment_reported') then
    return v_book.status;
  end if;
  -- Бронь истекла: места могли уже уйти. Только через «Поздняя оплата».
  if v_book.expires_at is not null and v_book.expires_at < now() then
    perform public.expire_stale_booking(v_book.id);
    return 'expired';
  end if;

  select event_date into v_event_date from public.culture_events where id = v_book.event_id;
  if v_event_date is not null and v_event_date < now() then
    return 'event_finished';
  end if;

  update public.bookings
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(),
      kaspi_operation_id = coalesce(v_operation, kaspi_operation_id), expires_at = null, updated_at = now()
  where id = v_book.id;

  -- Действующие коды билетов появляются только сейчас.
  update public.booking_items set ticket_code = gen_random_uuid()
  where booking_id = v_book.id and released_at is null;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, operation_id)
  values (v_book.id, v_book.organization_id, 'confirmed', auth.uid(), v_book.total_amount, v_operation);

  return 'confirmed';
end;
$fn$;

revoke all on function public.confirm_booking_manual(uuid, text) from public;
grant execute on function public.confirm_booking_manual(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. «Отклонить» — кассир не нашёл оплату. Места освобождаются.
-- ---------------------------------------------------------------------
create or replace function public.reject_booking(p_booking_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  v_book := public.staff_booking_for_update(p_booking_id);

  if v_book.status = 'rejected' then
    return 'already_rejected';
  end if;
  if v_book.status not in ('pending', 'payment_reported', 'expired') then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'rejected', rejected_at = now(), rejected_by = auth.uid(),
      resolution_note = coalesce(v_note, resolution_note), expires_at = null, updated_at = now()
  where id = v_book.id;

  update public.booking_items set released_at = now()
  where booking_id = v_book.id and released_at is null;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
  values (v_book.id, v_book.organization_id, 'rejected', auth.uid(), v_book.total_amount, v_note);

  return 'rejected';
end;
$fn$;

revoke all on function public.reject_booking(uuid, text) from public;
grant execute on function public.reject_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 9. «Поздняя оплата» — деньги пришли после истечения брони.
--    Билеты НЕ выдаются; дальше кассир выбирает «Выдать» или «Возврат».
-- ---------------------------------------------------------------------
create or replace function public.mark_booking_late(p_booking_id uuid, p_operation_id text default null, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_operation text := nullif(trim(coalesce(p_operation_id, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  v_book := public.staff_booking_for_update(p_booking_id);

  -- Истёкшая, но ещё не снятая бронь — сначала снять.
  if v_book.status in ('pending', 'payment_reported') and v_book.expires_at < now() then
    perform public.expire_stale_booking(v_book.id);
    select * into v_book from public.bookings where id = v_book.id;
  end if;

  if v_book.status = 'late_payment' then
    return 'already_late';
  end if;
  if v_book.status not in ('expired', 'rejected') then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'late_payment', late_marked_at = now(), late_marked_by = auth.uid(),
      kaspi_operation_id = coalesce(v_operation, kaspi_operation_id),
      resolution_note = coalesce(v_note, resolution_note), updated_at = now()
  where id = v_book.id;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, operation_id, note)
  values (v_book.id, v_book.organization_id, 'late', auth.uid(), v_book.total_amount, v_operation, v_note);

  return 'late';
end;
$fn$;

revoke all on function public.mark_booking_late(uuid, text, text) from public;
grant execute on function public.mark_booking_late(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. «Выдать билеты» по поздней оплате — только если те же места свободны.
--     Уникальный индекс uq_seat_per_event_active не даст занять проданное.
-- ---------------------------------------------------------------------
create or replace function public.issue_late_booking(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_event_date timestamptz;
begin
  v_book := public.staff_booking_for_update(p_booking_id);

  if v_book.status = 'confirmed' then
    return 'already_confirmed';
  end if;
  if v_book.status <> 'late_payment' then
    return v_book.status;
  end if;

  select event_date into v_event_date from public.culture_events where id = v_book.event_id;
  if v_event_date is not null and v_event_date < now() then
    return 'event_finished';
  end if;

  perform public.expire_stale_bookings_for_event(v_book.event_id);

  begin
    update public.booking_items set released_at = null, ticket_code = gen_random_uuid()
    where booking_id = v_book.id;
  exception when unique_violation then
    return 'seats_taken';
  end;

  update public.bookings
  set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid(), updated_at = now()
  where id = v_book.id;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, operation_id)
  values (v_book.id, v_book.organization_id, 'issued_late', auth.uid(), v_book.total_amount, v_book.kaspi_operation_id);

  return 'confirmed';
end;
$fn$;

revoke all on function public.issue_late_booking(uuid) from public;
grant execute on function public.issue_late_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 11. «Отметить возврат» — деньги вернули в Kaspi вне сайта.
--     Места освобождаются, QR больше не пускает на вход.
-- ---------------------------------------------------------------------
create or replace function public.mark_booking_refunded(p_booking_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  v_book := public.staff_booking_for_update(p_booking_id);

  if v_book.status = 'refunded' then
    return 'already_refunded';
  end if;
  if v_book.status not in ('confirmed', 'late_payment') then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'refunded', refunded_at = now(), refunded_by = auth.uid(),
      resolution_note = coalesce(v_note, resolution_note), updated_at = now()
  where id = v_book.id;

  update public.booking_items set released_at = now()
  where booking_id = v_book.id and released_at is null;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
  values (v_book.id, v_book.organization_id, 'refunded', auth.uid(), v_book.total_amount, v_note);

  return 'refunded';
end;
$fn$;

revoke all on function public.mark_booking_refunded(uuid, text) from public;
grant execute on function public.mark_booking_refunded(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 12. Страница заказа покупателя
-- ---------------------------------------------------------------------
drop function if exists public.get_booking_by_token(uuid);

create function public.get_booking_by_token(p_token uuid)
returns table (
  booking_id          uuid,
  status              text,
  buyer_name          text,
  buyer_phone         text,
  total_amount        numeric,
  expires_at          timestamptz,
  created_at          timestamptz,
  item_id             uuid,
  seat_id             uuid,
  row_label           text,
  seat_number         int,
  category            text,
  ticket_type_name_kk text,
  ticket_type_name_ru text,
  price_at_booking    numeric,
  ticket_code         uuid,
  released_at         timestamptz,
  organization_id     uuid,
  event_id            uuid,
  public_order_id     text,
  payment_reported_at timestamptz
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
      bi.id, bi.seat_id, hs.row_label, hs.seat_number, coalesce(tt.category, hs.category),
      tt.name_kk, tt.name_ru, bi.price_at_booking,
      -- Код билета существует для покупателя только у подтверждённого заказа.
      case when b.status = 'confirmed' then bi.ticket_code end,
      bi.released_at, b.organization_id, b.event_id, b.public_order_id::text, b.payment_reported_at
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

-- ---------------------------------------------------------------------
-- 13. create_booking: цена по категории места в мероприятии
--     (как в 20260930120000), с отказом для прошедших (как в 20261003134940)
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
  v_event_date timestamptz;
  v_booking_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_total numeric(10,2);
  v_status text;
  v_expires_at timestamptz;
  v_requested_count int;
  v_inserted_count int;
begin
  if p_seat_ids is null or array_length(p_seat_ids, 1) is null then
    raise exception 'no_seats_selected' using errcode = '22023';
  end if;
  if trim(coalesce(p_buyer_name, '')) = '' or trim(coalesce(p_buyer_phone, '')) = '' then
    raise exception 'missing_buyer_info' using errcode = '22023';
  end if;

  select organization_id, hall_id, event_date into v_org_id, v_hall_id, v_event_date
  from public.culture_events where id = p_event_id;

  if v_org_id is null then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_hall_id is null then
    raise exception 'event_has_no_hall' using errcode = '22023';
  end if;
  if v_event_date is not null and v_event_date < now() then
    raise exception 'event_finished' using errcode = '22023';
  end if;

  perform public.expire_stale_bookings_for_event(p_event_id);

  v_requested_count := array_length(p_seat_ids, 1);

  insert into public.bookings (event_id, organization_id, buyer_name, buyer_phone, status, total_amount, access_token, expires_at)
  values (p_event_id, v_org_id, trim(p_buyer_name), trim(p_buyer_phone), 'pending', 0, v_access_token, now() + interval '15 minutes')
  returning id into v_booking_id;

  insert into public.booking_items (booking_id, event_id, seat_id, ticket_type_id, price_at_booking)
  select v_booking_id, p_event_id, hs.id, tt.id, tt.price
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id and hs.hall_id = v_hall_id and hs.is_active = true
  left join public.event_seat_categories esc on esc.event_id = p_event_id and esc.seat_id = hs.id
  join public.event_ticket_types tt
    on tt.event_id = p_event_id and tt.category = coalesce(esc.category, 'standard') and tt.is_active = true;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> v_requested_count then
    raise exception 'seat_not_available' using errcode = '22023';
  end if;

  select coalesce(sum(bi.price_at_booking), 0) into v_total
  from public.booking_items bi where bi.booking_id = v_booking_id;

  if v_total = 0 then
    v_status := 'confirmed';
    v_expires_at := null;
  else
    v_status := 'pending';
    v_expires_at := now() + interval '15 minutes';
  end if;

  update public.bookings
  set status = v_status, total_amount = v_total, expires_at = v_expires_at, updated_at = now()
  where id = v_booking_id;

  return query select v_booking_id, v_access_token, v_status, v_total;
end;
$fn$;

revoke all on function public.create_booking(uuid, text, text, uuid[]) from public;
grant execute on function public.create_booking(uuid, text, text, uuid[]) to anon, authenticated;

commit;
