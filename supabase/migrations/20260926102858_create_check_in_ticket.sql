-- =====================================================================
-- create_check_in_ticket — Фаза 5: подтверждение билета на входе через QR
--
-- Последний шаг цепочки: купил → оплатил → пришёл → его пустили.
-- booking_items.ticket_code и .checked_in_at существуют с Фазы 3, но
-- checked_in_at всегда был NULL — эта функция первая, кто его меняет.
--
-- Единственная точка изменения checked_in_at — по аналогии с
-- create_booking как единственной точкой вставки bookings/booking_items.
-- Не трогает culture_clubs, culture_events (кроме чтения title_kk/ru),
-- halls/hall_seats, event_ticket_types, create_booking,
-- organization_payment_methods.
-- =====================================================================

begin;

create or replace function public.check_in_ticket(p_ticket_code uuid)
returns table (
  result text,
  seat_row_label text,
  seat_number int,
  event_title_kk text,
  event_title_ru text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_item_id uuid;
  v_booking_id uuid;
  v_checked_in_at timestamptz;
  v_seat_id uuid;
  v_org_id uuid;
  v_event_id uuid;
  v_status text;
  v_row_label text;
  v_seat_number int;
  v_title_kk text;
  v_title_ru text;
begin
  select bi.id, bi.booking_id, bi.checked_in_at, bi.seat_id
  into v_item_id, v_booking_id, v_checked_in_at, v_seat_id
  from public.booking_items bi
  where bi.ticket_code = p_ticket_code;

  if not found then
    return query select 'not_found'::text, null::text, null::int, null::text, null::text, null::timestamptz;
    return;
  end if;

  select b.status, b.organization_id, b.event_id
  into v_status, v_org_id, v_event_id
  from public.bookings b
  where b.id = v_booking_id;

  -- is_staff_of can return NULL (not just false) when the caller's own
  -- profile has no organization_id — "if not is_staff_of(...)" would then
  -- be "if not NULL" = NULL, which plpgsql treats the same as false and
  -- SKIPS this guard entirely. Caught by testing before this was ever
  -- applied. Must check explicitly against true.
  if public.is_staff_of(v_org_id) is not true then
    return query select 'not_found'::text, null::text, null::int, null::text, null::text, null::timestamptz;
    return;
  end if;

  select hs.row_label, hs.seat_number into v_row_label, v_seat_number
  from public.hall_seats hs where hs.id = v_seat_id;

  select e.title_kk, e.title_ru into v_title_kk, v_title_ru
  from public.culture_events e where e.id = v_event_id;

  if v_status <> 'confirmed' then
    return query select 'not_confirmed'::text, v_row_label, v_seat_number, v_title_kk, v_title_ru, null::timestamptz;
    return;
  end if;

  if v_checked_in_at is not null then
    return query select 'already_used'::text, v_row_label, v_seat_number, v_title_kk, v_title_ru, v_checked_in_at;
    return;
  end if;

  -- Condition in the WHERE, not just a prior read: two simultaneous scans of
  -- the same ticket (two devices at the door) must not both get 'ok' — the
  -- second sees zero rows updated and correctly falls through to
  -- 'already_used' with the real timestamp.
  update public.booking_items bi
  set checked_in_at = now()
  where bi.id = v_item_id and bi.checked_in_at is null
  returning bi.checked_in_at into v_checked_in_at;

  if not found then
    select bi.checked_in_at into v_checked_in_at from public.booking_items bi where bi.id = v_item_id;
    return query select 'already_used'::text, v_row_label, v_seat_number, v_title_kk, v_title_ru, v_checked_in_at;
    return;
  end if;

  return query select 'ok'::text, v_row_label, v_seat_number, v_title_kk, v_title_ru, v_checked_in_at;
end;
$fn$;

revoke all on function public.check_in_ticket(uuid) from public;
grant execute on function public.check_in_ticket(uuid) to authenticated;
-- anon deliberately gets no EXECUTE at all — a guest scans nothing, staff does.

commit;
