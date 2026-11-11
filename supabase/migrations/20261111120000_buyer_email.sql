-- =====================================================================
-- Покупатель указывает только электронную почту
-- =====================================================================
--
-- Имя и телефон покупателя больше не запрашиваются: билеты приходят на
-- почту, а также остаются на странице заказа и в «Моих билетах».
--
-- 1. bookings.buyer_email — почта покупателя; buyer_name и buyer_phone
--    становятся необязательными (у прежних заказов они остаются).
-- 2. bookings.buyer_locale — язык страницы, на которой оформлен заказ:
--    на нём отправляется письмо и составляется PDF.
-- 3. bookings.tickets_emailed_at — когда письмо с билетами отправлено.
--    Сайт ставит отметку перед отправкой одним UPDATE ... WHERE
--    tickets_emailed_at IS NULL, поэтому письмо не уходит дважды; если
--    отправка не удалась, отметка снимается и сверка пробует снова.
-- 4. create_booking_by_email — бронирование с почтой вместо имени и
--    телефона. Прежняя create_booking остаётся для совместимости.
-- =====================================================================

alter table public.bookings add column if not exists buyer_email text;
alter table public.bookings add column if not exists buyer_locale text;
alter table public.bookings add column if not exists tickets_emailed_at timestamptz;

alter table public.bookings alter column buyer_name drop not null;
alter table public.bookings alter column buyer_phone drop not null;

alter table public.bookings drop constraint if exists bookings_buyer_email_check;
alter table public.bookings add constraint bookings_buyer_email_check
  check (buyer_email is null or (length(buyer_email) <= 254 and buyer_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));

alter table public.bookings drop constraint if exists bookings_buyer_locale_check;
alter table public.bookings add constraint bookings_buyer_locale_check
  check (buyer_locale is null or buyer_locale in ('kk', 'ru'));

comment on column public.bookings.buyer_email is 'Почта покупателя: на неё отправляются билеты.';
comment on column public.bookings.buyer_locale is 'Язык, на котором оформлен заказ (kk/ru): язык письма и PDF.';
comment on column public.bookings.tickets_emailed_at is 'Когда отправлено письмо с билетами. NULL — ещё не отправлено.';

create or replace function public.create_booking_by_email(
  p_event_id uuid,
  p_buyer_email text,
  p_seat_ids uuid[],
  p_locale text default 'ru'
)
returns table (booking_id uuid, access_token uuid, status text, total_amount numeric)
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
  v_email text := lower(trim(coalesce(p_buyer_email, '')));
  v_locale text := case when p_locale = 'kk' then 'kk' else 'ru' end;
begin
  if p_seat_ids is null or array_length(p_seat_ids, 1) is null then
    raise exception 'no_seats_selected' using errcode = '22023';
  end if;
  if v_email = '' or length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
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

  insert into public.bookings (event_id, organization_id, buyer_email, buyer_locale, status, total_amount, access_token, expires_at)
  values (p_event_id, v_org_id, v_email, v_locale, 'pending', 0, v_access_token, now() + interval '15 minutes')
  returning id into v_booking_id;

  insert into public.booking_items (booking_id, event_id, seat_id, ticket_type_id, price_at_booking)
  select v_booking_id, p_event_id, hs.id, tt.id, tt.price
  from unnest(p_seat_ids) as seat_id
  join public.hall_seats hs on hs.id = seat_id and hs.hall_id = v_hall_id and hs.is_active = true
  left join public.event_seat_categories esc on esc.event_id = p_event_id and esc.seat_id = hs.id
  join public.event_ticket_types tt
    on tt.event_id = p_event_id and tt.category = coalesce(esc.category, 'standard') and tt.is_active = true
  -- Закрытое на это мероприятие место не продаётся.
  where not exists (
    select 1 from public.event_seat_blocks blk where blk.event_id = p_event_id and blk.seat_id = hs.id
  );

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

revoke all on function public.create_booking_by_email(uuid, text, uuid[], text) from public;
grant execute on function public.create_booking_by_email(uuid, text, uuid[], text) to anon, authenticated;
