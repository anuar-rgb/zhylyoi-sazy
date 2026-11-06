-- =====================================================================
-- Подготовка к автоматической оплате картой (Halyk ePay)
--
-- Пока способ оплаты не переведён в режим «через банк», покупатели этих
-- изменений не замечают: settle_payment вызывается только для такого способа.
--
--   1. organization_payment_secrets.client_id — банк выдаёт три значения
--      (TerminalID, ClientID, ClientSecret), колонок было на два.
--   2. next_payment_invoice_seq — последние 6 цифр номера заказа в банке,
--      их уникальность требует банк. Первые цифры случайные, их подставит сервер.
--   3. settle_payment (изменение существующей функции):
--        * деньги за отклонённый заказ или заказ с поздней оплатой не
--          подтверждают его без мест: места сначала возвращаются, как у expired;
--        * место, закрытое «Бронь» / «Неисправно», назад не выдаётся;
--        * мероприятие уже началось — билет не выдаётся, платёж к возврату.
--   4. cancel_booking_by_token — «Отменить и выбрать другие места».
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Ключи банка
-- ---------------------------------------------------------------------
alter table public.organization_payment_secrets
  add column if not exists client_id text;

-- ---------------------------------------------------------------------
-- 2. Номер заказа в банке
-- ---------------------------------------------------------------------
create sequence if not exists public.payment_invoice_seq minvalue 1 maxvalue 999999 cycle;

revoke all on sequence public.payment_invoice_seq from public, anon, authenticated;

create or replace function public.next_payment_invoice_seq()
returns bigint
language sql
security definer
set search_path = ''
as $fn$
  select nextval('public.payment_invoice_seq');
$fn$;

revoke all on function public.next_payment_invoice_seq() from public, anon, authenticated;
grant execute on function public.next_payment_invoice_seq() to service_role;

-- ---------------------------------------------------------------------
-- 3. settle_payment
-- ---------------------------------------------------------------------
create or replace function public.settle_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_currency text,
  p_provider_txn text default null
)
returns table (result text, settled_booking_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  pay public.payments%rowtype;
  bk public.bookings%rowtype;
  v_other_success boolean;
  v_event_started boolean;
  v_blocked boolean;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    return query select 'unknown_payment'::text, null::uuid;
    return;
  end if;

  if pay.status = 'success' then
    return query select 'already_settled'::text, pay.booking_id;
    return;
  end if;
  if pay.status in ('refund_pending', 'refunded') then
    return query select 'already_refunded'::text, pay.booking_id;
    return;
  end if;
  if pay.amount <> p_amount then
    return query select 'amount_mismatch'::text, pay.booking_id;
    return;
  end if;
  if upper(pay.currency) <> upper(p_currency) then
    return query select 'currency_mismatch'::text, pay.booking_id;
    return;
  end if;

  select * into bk from public.bookings where id = pay.booking_id for update;

  select exists (
    select 1 from public.payments o
    where o.booking_id = pay.booking_id and o.id <> pay.id and o.status = 'success'
  ) into v_other_success;

  if v_other_success then
    update public.payments
    set status = 'success', paid_at = now(), needs_refund = true, note = 'duplicate_payment',
        provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
    where id = pay.id;
    return query select 'duplicate_payment'::text, pay.booking_id;
    return;
  end if;

  if bk.status in ('cancelled', 'refunded') then
    update public.payments
    set status = 'success', paid_at = now(), needs_refund = true, note = 'booking_' || bk.status,
        provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
    where id = pay.id;
    return query select 'paid_booking_closed'::text, pay.booking_id;
    return;
  end if;

  if bk.status = 'confirmed' then
    update public.payments
    set status = 'success', paid_at = now(),
        provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
    where id = pay.id;
    return query select 'settled'::text, pay.booking_id;
    return;
  end if;

  if bk.status in ('expired', 'rejected', 'late_payment') then
    -- The seats were let go before the money arrived. Take them back if nothing stands in the way.
    select coalesce(e.event_date < now(), false) into v_event_started
    from public.culture_events e where e.id = bk.event_id;

    select exists (
      select 1
      from public.booking_items i
      join public.event_seat_blocks s on s.event_id = i.event_id and s.seat_id = i.seat_id
      where i.booking_id = bk.id
    ) into v_blocked;

    if coalesce(v_event_started, false) or v_blocked then
      update public.payments
      set status = 'success', paid_at = now(), needs_refund = true,
          note = case when v_blocked then 'seats_blocked' else 'event_started' end,
          provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
      where id = pay.id;
      return query select 'paid_seats_lost'::text, pay.booking_id;
      return;
    end if;

    begin
      update public.booking_items set released_at = null
      where booking_id = bk.id and released_at is not null;

      update public.bookings
      set status = 'confirmed', confirmed_at = now(), confirmed_by = null, expires_at = null
      where id = bk.id;

      update public.payments
      set status = 'success', paid_at = now(), note = 'settled_after_hold_expired',
          provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
      where id = pay.id;

      return query select 'settled_late'::text, pay.booking_id;
      return;
    exception when unique_violation then
      -- Someone else holds a seat now: the update above is undone, and the money is flagged.
      update public.payments
      set status = 'success', paid_at = now(), needs_refund = true, note = 'seats_lost',
          provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
      where id = pay.id;
      return query select 'paid_seats_lost'::text, pay.booking_id;
      return;
    end;
  end if;

  -- pending or payment_reported: the normal case (a hold that ran out but was not yet marked keeps its seats)
  update public.bookings
  set status = 'confirmed', confirmed_at = now(), confirmed_by = null, expires_at = null
  where id = bk.id;

  update public.payments
  set status = 'success', paid_at = now(),
      provider_transaction_id = coalesce(p_provider_txn, provider_transaction_id)
  where id = pay.id;

  return query select 'settled'::text, pay.booking_id;
end;
$fn$;

revoke all on function public.settle_payment(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.settle_payment(uuid, numeric, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 4. Покупатель отпускает свои места
-- ---------------------------------------------------------------------
alter table public.booking_actions drop constraint if exists booking_actions_action_check;
alter table public.booking_actions add constraint booking_actions_action_check
  check (action in ('reported', 'confirmed', 'rejected', 'late', 'issued_late', 'refunded', 'cancelled'));

create or replace function public.cancel_booking_by_token(p_token uuid)
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

  if v_book.status = 'cancelled' then
    return 'already_cancelled';
  end if;
  -- Only an order still waiting for money: nothing the buyer has been told is paid can be undone here.
  if v_book.status <> 'pending' then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'cancelled', expires_at = null, updated_at = now()
  where id = v_book.id;

  update public.booking_items set released_at = now()
  where booking_id = v_book.id and released_at is null;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount)
  values (v_book.id, v_book.organization_id, 'cancelled', null, v_book.total_amount);

  return 'cancelled';
end;
$fn$;

revoke all on function public.cancel_booking_by_token(uuid) from public;
grant execute on function public.cancel_booking_by_token(uuid) to anon, authenticated;

commit;
