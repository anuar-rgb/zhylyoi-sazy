-- =====================================================================
-- culture_events.payment_method_id — per-event payment-method override
--
-- Payment methods (organization_payment_methods) were org-wide only: every
-- enabled method showed on every event's /my-ticket page. Some events need
-- to show just one specific method instead (e.g. a one-off event with its
-- own QR). Null keeps today's behaviour — every enabled org method shown.
--
-- get_booking_by_token gains event_id so the buyer-facing page can resolve
-- this override without a second round trip keyed by booking id.
-- =====================================================================

begin;

alter table public.culture_events
  add column payment_method_id uuid references public.organization_payment_methods(id) on delete set null;

comment on column public.culture_events.payment_method_id is
  'Restricts /my-ticket for this event to a single organization_payment_methods row; null falls back to every enabled org-wide method.';

create index if not exists idx_culture_events_payment_method_id on public.culture_events (payment_method_id);

-- RETURNS TABLE нельзя расширить через CREATE OR REPLACE без DROP —
-- Postgres отказывается менять состав OUT-параметров на лету.
drop function if exists public.get_booking_by_token(uuid);

create function public.get_booking_by_token(p_token uuid)
returns table (
  booking_id        uuid,
  status            text,
  buyer_name        text,
  buyer_phone       text,
  total_amount      numeric,
  expires_at        timestamptz,
  created_at        timestamptz,
  item_id           uuid,
  seat_id           uuid,
  row_label         text,
  seat_number       int,
  category          text,
  ticket_type_name_kk text,
  ticket_type_name_ru text,
  price_at_booking  numeric,
  ticket_code       uuid,
  released_at       timestamptz,
  organization_id   uuid,
  event_id          uuid
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
      bi.id, bi.seat_id, hs.row_label, hs.seat_number, hs.category,
      tt.name_kk, tt.name_ru, bi.price_at_booking, bi.ticket_code, bi.released_at,
      b.organization_id, b.event_id
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

commit;
