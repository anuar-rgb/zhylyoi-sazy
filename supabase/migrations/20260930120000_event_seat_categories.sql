-- =====================================================================
-- event_seat_categories — per-event seat category override
--
-- hall_seats.category was the only source of "vip" vs "standard": every
-- event held in a hall showed the exact same split, and staff could not
-- run one ticketed event with vip tables and another, plainer one, in the
-- same physical room without vip following it around. A missing row here
-- means "standard" for that event — never the hall's own category — so an
-- event that never touches this table sells everything as standard
-- regardless of what the hall's base layout says.
--
-- create_booking is updated to price seats by this resolved category
-- instead of hall_seats.category directly. hall_seats.category itself is
-- untouched and keeps meaning exactly what it always did for the hall's
-- own base layout in "Залы" — it just stops being what a buyer or an
-- event's pricing actually sees.
-- =====================================================================

begin;

create table public.event_seat_categories (
  event_id   uuid not null references public.culture_events(id) on delete cascade,
  seat_id    uuid not null references public.hall_seats(id) on delete cascade,
  category   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, seat_id)
);

comment on table public.event_seat_categories is
  'Per-event override of a seat''s category for pricing/display. No row = "standard" for that event, regardless of hall_seats.category.';

create index if not exists idx_event_seat_categories_seat_id on public.event_seat_categories (seat_id);

-- Backfill: every existing ticketed event keeps exactly the vip/other seats
-- it has today, copied from the hall's current category at the moment this
-- migration runs. Without this, the app code's "no row = standard" default
-- would make every already-live event's vip seats sell as standard the
-- instant this ships — an existing event's seat map goes on to diverge from
-- the hall only when staff themselves change it from here on.
insert into public.event_seat_categories (event_id, seat_id, category)
select ce.id, hs.id, hs.category
from public.culture_events ce
join public.hall_seats hs on hs.hall_id = ce.hall_id
where ce.hall_id is not null and hs.category <> 'standard'
on conflict (event_id, seat_id) do nothing;

create trigger trg_event_seat_categories_updated_at
  before update on public.event_seat_categories
  for each row execute function public.set_updated_at();

revoke all on public.event_seat_categories from anon;
revoke all on public.event_seat_categories from authenticated;
grant select on public.event_seat_categories to anon, authenticated;
grant insert, update, delete on public.event_seat_categories to authenticated;

alter table public.event_seat_categories enable row level security;

-- Same gate as culture_events_public_read: a buyer only ever resolves
-- categories for an event they can already see.
create policy event_seat_categories_public_read on public.event_seat_categories
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.culture_events ce
      where ce.id = event_seat_categories.event_id and ce.status = 'published'
    )
  );

create policy event_seat_categories_staff_all on public.event_seat_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.culture_events ce
      where ce.id = event_seat_categories.event_id and public.is_staff_of(ce.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.culture_events ce
      where ce.id = event_seat_categories.event_id and public.is_staff_of(ce.organization_id)
    )
  );

-- ---------------------------------------------------------------------
-- create_booking: price by the resolved per-event category
-- (coalesce(override, 'standard')) instead of hall_seats.category.
-- Same signature, so CREATE OR REPLACE is enough — no DROP needed.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_event_id uuid,
  p_buyer_name text,
  p_buyer_phone text,
  p_seat_ids uuid[]
)
returns table (booking_id uuid, access_token uuid, status text, total_amount numeric)
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

commit;
