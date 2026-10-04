-- =====================================================================
-- Ticketing foundation: payments, webhook journal, check-in journal,
-- settlement and a stricter check-in.
--
-- Applied by hand in the Supabase SQL Editor (the migration tool is not
-- connected), so supabase_migrations does not list it. The statements are
-- written to be safe to run again.
--
-- The existing model is extended, not duplicated:
--   bookings       = orders   (+ human order number, currency, "refunded")
--   booking_items  = tickets  (ticket_code is the random QR token)
--   payments       = NEW      one row per attempt to pay a booking
--   payment_webhook_events = NEW  every notification a bank sent, accepted or not
--   ticket_checkins        = NEW  every scan at the door, append-only
-- payment_events (earlier journal of verified notifications) is superseded
-- by payments + payment_webhook_events and is no longer written to.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. bookings: order number people can read out, currency, refunds
-- ---------------------------------------------------------------------
create sequence if not exists public.booking_order_seq;

alter table public.bookings
  add column if not exists public_order_id text,
  add column if not exists currency text not null default 'KZT';

update public.bookings
set public_order_id = 'DK-' || lpad(nextval('public.booking_order_seq')::text, 6, '0')
where public_order_id is null;

alter table public.bookings
  alter column public_order_id set default ('DK-' || lpad(nextval('public.booking_order_seq')::text, 6, '0')),
  alter column public_order_id set not null;

create unique index if not exists uq_bookings_public_order_id on public.bookings (public_order_id);

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'expired', 'refunded'));

-- ---------------------------------------------------------------------
-- 2. payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_method_id uuid references public.organization_payment_methods(id) on delete set null,

  provider_code text not null,
  provider_payment_id text,
  provider_transaction_id text,

  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'KZT',

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'cancelled', 'refund_pending', 'refunded')),
  failure_reason text,

  -- Money arrived but the booking could not honour it (seats resold, booking cancelled, a second
  -- payment for the same booking): staff must refund by hand. Never decided silently.
  needs_refund boolean not null default false,
  note text,

  -- Non-secret references only. Never card data, never CVV, never a provider secret.
  metadata jsonb not null default '{}'::jsonb,

  -- A fiscal receipt is a separate thing from this payment and from the ticket. These are filled
  -- only from what the provider or fiscal operator reports.
  receipt_id text,
  receipt_url text,
  receipt_status text,

  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The same provider payment can only ever exist once: a repeated webhook finds the row, not a new one.
create unique index if not exists uq_payments_provider_payment
  on public.payments (provider_code, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists idx_payments_booking on public.payments (booking_id);
create index if not exists idx_payments_status_created on public.payments (status, created_at);
create index if not exists idx_payments_org_created on public.payments (organization_id, created_at desc);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

revoke all on public.payments from anon;
revoke all on public.payments from authenticated;
grant select on public.payments to authenticated;
alter table public.payments enable row level security;

drop policy if exists payments_staff_read on public.payments;
create policy payments_staff_read on public.payments
  for select to authenticated
  using (public.is_staff_of(organization_id));

-- ---------------------------------------------------------------------
-- 3. payment_webhook_events: what arrived, when, what became of it
-- ---------------------------------------------------------------------
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  payment_method_id uuid references public.organization_payment_methods(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_id text,
  payment_id text,
  event_type text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'rejected', 'error')),
  error text,
  -- A fingerprint of the body, not the body: enough to tell two deliveries apart without keeping
  -- whatever the bank put in it.
  payload_hash text
);

create index if not exists idx_pwe_org_received on public.payment_webhook_events (organization_id, received_at desc);
create index if not exists idx_pwe_provider_event on public.payment_webhook_events (provider_code, event_id);

revoke all on public.payment_webhook_events from anon;
revoke all on public.payment_webhook_events from authenticated;
grant select on public.payment_webhook_events to authenticated;
alter table public.payment_webhook_events enable row level security;

drop policy if exists pwe_staff_read on public.payment_webhook_events;
create policy pwe_staff_read on public.payment_webhook_events
  for select to authenticated
  using (organization_id is not null and public.is_staff_of(organization_id));

-- ---------------------------------------------------------------------
-- 4. ticket_checkins: every scan, append-only
-- ---------------------------------------------------------------------
create table if not exists public.ticket_checkins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  booking_item_id uuid references public.booking_items(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  -- the event the ticket belongs to, and the event the door was checking for
  ticket_event_id uuid references public.culture_events(id) on delete set null,
  scanned_event_id uuid references public.culture_events(id) on delete set null,
  result text not null
    check (result in ('ok', 'already_used', 'not_found', 'not_confirmed', 'wrong_event', 'cancelled', 'expired', 'not_started')),
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_checkins_item on public.ticket_checkins (booking_item_id);
create index if not exists idx_checkins_event on public.ticket_checkins (ticket_event_id, checked_at desc);
create index if not exists idx_checkins_org on public.ticket_checkins (organization_id, checked_at desc);

-- Read-only for everyone who can sign in. Rows are written by check_in_ticket alone.
revoke all on public.ticket_checkins from anon;
revoke all on public.ticket_checkins from authenticated;
grant select on public.ticket_checkins to authenticated;
alter table public.ticket_checkins enable row level security;

drop policy if exists checkins_staff_read on public.ticket_checkins;
create policy checkins_staff_read on public.ticket_checkins
  for select to authenticated
  using (organization_id is not null and public.is_staff_of(organization_id));

-- ---------------------------------------------------------------------
-- 5. settle_payment: the one place a payment becomes a confirmed booking
--
-- Called by the server with the service-role key after the bank's notification has been verified.
-- One transaction, row locks on the payment and the booking: two deliveries of the same webhook, or
-- a webhook racing a staff member's manual confirmation, cannot both win.
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

  if bk.status = 'expired' then
    -- The hold lapsed before the money arrived. Take the seats back if nobody else has them.
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

  -- pending: the normal case (a hold that ran out but was not yet marked keeps its seats)
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
-- 6. apply_refund: after the provider confirmed the money went back
-- ---------------------------------------------------------------------
create or replace function public.apply_refund(p_payment_id uuid)
returns table (result text, refunded_booking_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  pay public.payments%rowtype;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    return query select 'unknown_payment'::text, null::uuid;
    return;
  end if;
  if pay.status = 'refunded' then
    return query select 'already_refunded'::text, pay.booking_id;
    return;
  end if;
  if pay.status not in ('success', 'refund_pending') then
    return query select 'not_refundable'::text, pay.booking_id;
    return;
  end if;

  update public.payments set status = 'refunded', refunded_at = now(), needs_refund = false where id = pay.id;

  update public.bookings set status = 'refunded', updated_at = now() where id = pay.booking_id;

  -- the seats go back on sale and the tickets stop working
  update public.booking_items
  set released_at = coalesce(released_at, now())
  where booking_id = pay.booking_id;

  return query select 'refunded'::text, pay.booking_id;
end;
$fn$;

revoke all on function public.apply_refund(uuid) from public, anon, authenticated;
grant execute on function public.apply_refund(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 7. check_in_ticket: now knows which event the door is for, and keeps a journal
--
-- Results: ok, already_used, not_found, not_confirmed, wrong_event, cancelled, expired, not_started.
-- A ticket from another institution is "not_found", exactly as before: staff learn nothing about
-- other institutions' tickets.
-- Entry is allowed from 6 hours before the event starts until 12 hours after.
-- ---------------------------------------------------------------------
drop function if exists public.check_in_ticket(uuid);

create or replace function public.check_in_ticket(p_ticket_code uuid, p_event_id uuid default null)
returns table (
  result text,
  seat_row_label text,
  seat_number int,
  event_title_kk text,
  event_title_ru text,
  checked_in_at timestamptz,
  public_order_id text,
  event_date timestamptz
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_item public.booking_items%rowtype;
  v_book public.bookings%rowtype;
  v_event public.culture_events%rowtype;
  v_row_label text;
  v_seat_number int;
  v_result text;
  v_checked timestamptz;
  v_caller_org uuid := (select public.current_org_id());
begin
  select * into v_item from public.booking_items where ticket_code = p_ticket_code;

  if not found then
    insert into public.ticket_checkins (organization_id, scanned_event_id, result, checked_by, metadata)
    values (v_caller_org, p_event_id, 'not_found', auth.uid(), jsonb_build_object('code_prefix', left(p_ticket_code::text, 8)));
    return query select 'not_found'::text, null::text, null::int, null::text, null::text, null::timestamptz, null::text, null::timestamptz;
    return;
  end if;

  select * into v_book from public.bookings where id = v_item.booking_id;

  -- is_staff_of can return NULL, not only false; "if not NULL" would skip the guard. Check against true.
  if public.is_staff_of(v_book.organization_id) is not true then
    insert into public.ticket_checkins (organization_id, scanned_event_id, result, checked_by, metadata)
    values (v_caller_org, p_event_id, 'not_found', auth.uid(), jsonb_build_object('code_prefix', left(p_ticket_code::text, 8)));
    return query select 'not_found'::text, null::text, null::int, null::text, null::text, null::timestamptz, null::text, null::timestamptz;
    return;
  end if;

  select hs.row_label, hs.seat_number into v_row_label, v_seat_number
  from public.hall_seats hs where hs.id = v_item.seat_id;

  select * into v_event from public.culture_events where id = v_book.event_id;

  if p_event_id is not null and v_book.event_id <> p_event_id then
    v_result := 'wrong_event';
  elsif v_book.status in ('cancelled', 'refunded') or (v_book.status = 'confirmed' and v_item.released_at is not null) then
    v_result := 'cancelled';
  elsif v_book.status <> 'confirmed' then
    v_result := 'not_confirmed';
  elsif v_item.checked_in_at is not null then
    v_result := 'already_used';
    v_checked := v_item.checked_in_at;
  elsif now() < v_event.event_date - interval '6 hours' then
    v_result := 'not_started';
  elsif now() > v_event.event_date + interval '12 hours' then
    v_result := 'expired';
  else
    -- The condition lives in the UPDATE, not only in the read above: two devices scanning the same
    -- ticket at the same instant cannot both get "ok". The loser updates zero rows.
    update public.booking_items bi
    set checked_in_at = now()
    where bi.id = v_item.id and bi.checked_in_at is null and bi.released_at is null
    returning bi.checked_in_at into v_checked;

    if found then
      v_result := 'ok';
    else
      select bi.checked_in_at into v_checked from public.booking_items bi where bi.id = v_item.id;
      v_result := 'already_used';
    end if;
  end if;

  insert into public.ticket_checkins
    (organization_id, booking_item_id, booking_id, ticket_event_id, scanned_event_id, result, checked_by)
  values
    (v_book.organization_id, v_item.id, v_book.id, v_book.event_id, p_event_id, v_result, auth.uid());

  return query select v_result, v_row_label, v_seat_number, v_event.title_kk, v_event.title_ru,
                      v_checked, v_book.public_order_id, v_event.event_date;
end;
$fn$;

revoke all on function public.check_in_ticket(uuid, uuid) from public, anon;
grant execute on function public.check_in_ticket(uuid, uuid) to authenticated;

commit;
