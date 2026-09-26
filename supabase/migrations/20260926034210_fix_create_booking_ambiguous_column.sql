-- =====================================================================
-- fix_create_booking_ambiguous_column — fixes a bug introduced by the
-- immediately preceding migration (20260926034037_fix_create_booking_race.sql)
--
-- RETURNS TABLE(booking_id uuid, ...) makes "booking_id" an implicit
-- plpgsql variable throughout the function body, in addition to being
-- a table column. The new
--   select coalesce(sum(price_at_booking), 0) into v_total
--   from public.booking_items where booking_id = v_booking_id
-- statement referenced the bare column name "booking_id", which
-- Postgres could not resolve between that output variable and
-- booking_items.booking_id — caught by testing in a rolled-back
-- transaction immediately after applying the previous migration,
-- before it was ever exercised by real traffic. Fixed by qualifying
-- the column through a table alias.
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

  perform public.expire_stale_bookings_for_event(p_event_id);

  v_requested_count := array_length(p_seat_ids, 1);

  insert into public.bookings (event_id, organization_id, buyer_name, buyer_phone, status, total_amount, access_token, expires_at)
  values (p_event_id, v_org_id, trim(p_buyer_name), trim(p_buyer_phone), 'pending', 0, v_access_token, now() + interval '15 minutes')
  returning id into v_booking_id;

  insert into public.booking_items (booking_id, event_id, seat_id, ticket_type_id, price_at_booking)
  select v_booking_id, p_event_id, hs.id, tt.id, tt.price
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id and hs.hall_id = v_hall_id and hs.is_active = true
  join public.event_ticket_types tt on tt.event_id = p_event_id and tt.category = hs.category and tt.is_active = true;

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
