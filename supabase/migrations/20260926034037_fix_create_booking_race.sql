-- =====================================================================
-- fix_create_booking_race — closes a race window in create_booking()
--
-- The original version (20260925180621_create_bookings.sql) computed
-- v_total with one SELECT (count+sum joined to hall_seats/
-- event_ticket_types) and then inserted booking_items with a SECOND,
-- separate SELECT against the same tables. Under READ COMMITTED each
-- statement takes its own snapshot, so if a seat's category changed
-- between the two (e.g. an admin re-categorizes a seat mid-booking),
-- the sum and the actually-inserted price_at_booking rows could
-- disagree — total_amount would no longer equal sum(price_at_booking).
--
-- Fix: collapse this into ONE read of hall_seats/event_ticket_types.
-- The booking_items INSERT...SELECT is now that single read; its
-- row count (via GET DIAGNOSTICS) replaces the old v_priced_count
-- check, and v_total is computed by summing the rows we ourselves
-- just inserted (our own uncommitted data in this transaction, not a
-- second read of the source tables). The bookings row is inserted
-- first as a placeholder (status/total_amount corrected afterwards)
-- because booking_items.booking_id is NOT NULL and must reference an
-- existing booking.
--
-- Verified in a rolled-back transaction: paid booking totals matching
-- sum(price_at_booking), double-booking still blocked by
-- uq_seat_per_event_active, free bookings still auto-confirm, unknown
-- seat_ids still raise seat_not_available instead of silently
-- reserving fewer seats than requested.
-- =====================================================================

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
  v_inserted_count int;
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

  -- Placeholder: booking_items.booking_id is NOT NULL, so the bookings row
  -- must exist before we can insert items. status/total_amount here are
  -- provisional — corrected below once the one real read of
  -- hall_seats/event_ticket_types has actually run.
  insert into public.bookings (event_id, organization_id, buyer_name, buyer_phone, status, total_amount, access_token, expires_at)
  values (p_event_id, v_org_id, trim(p_buyer_name), trim(p_buyer_phone), 'pending', 0, v_access_token, now() + interval '15 minutes')
  returning id into v_booking_id;

  -- The ONE read of hall_seats/event_ticket_types. Collapsing count+price+
  -- insert into a single INSERT...SELECT removes the two-snapshot race
  -- window entirely — whatever this statement sees is what gets priced
  -- and what gets inserted, in the same read.
  insert into public.booking_items (booking_id, event_id, seat_id, ticket_type_id, price_at_booking)
  select v_booking_id, p_event_id, hs.id, tt.id, tt.price
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id and hs.hall_id = v_hall_id and hs.is_active = true
  join public.event_ticket_types tt on tt.event_id = p_event_id and tt.category = hs.category and tt.is_active = true;

  get diagnostics v_inserted_count = row_count;

  -- Every requested seat must have resolved to a priced, active ticket type
  -- in this hall. A mismatch raises, which aborts this whole function
  -- invocation (one RPC call = one transaction), rolling back the bookings
  -- row above too — instead of silently reserving fewer seats than asked.
  if v_inserted_count <> v_requested_count then
    raise exception 'seat_not_available' using errcode = '22023';
  end if;

  -- Sum from the rows we just inserted — our own uncommitted booking_items,
  -- not a second read of hall_seats/event_ticket_types. Exactly what was
  -- actually written, guaranteed to match price_at_booking row by row.
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
