-- Отмена и перенос мероприятия, архив билетов.
--
-- 1. culture_events получает cancelled_at / cancel_reason (мероприятие отменено) и moved_from
--    (первоначальная дата, если мероприятие перенесли).
-- 2. cancel_event: сотрудник отменяет мероприятие до конца дня мероприятия (время Алматы). Продажа
--    закрывается, неоплаченные брони отменяются, бесплатные билеты аннулируются. Деньги за
--    оплаченные заказы возвращает банк: это делает сайт, по одному заказу, после этой функции.
-- 3. move_event: перенос на новую дату до начала. Билеты остаются действительными.
-- 4. booking_notices: какие письма об отмене и переносе уже ушли покупателю, чтобы не слать дважды.
-- 5. Мероприятие с выданными или оплаченными билетами нельзя удалить 3 года после его окончания:
--    это архив заказов (срок хранения из Политики конфиденциальности).
-- 6. create_booking_by_email продаёт только опубликованное и не отменённое мероприятие.
--    Старая create_booking (имя и телефон) сайтом больше не используется и закрыта для посетителей.

alter table public.culture_events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists moved_from timestamptz;

alter table public.culture_events
  add constraint culture_events_cancel_reason_length check (cancel_reason is null or length(cancel_reason) <= 500);

create table public.booking_notices (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('cancelled', 'moved')),
  -- Для переноса: новая дата, чтобы второй перенос снова дошёл до покупателя.
  ref text not null default '',
  sent_at timestamptz not null default now(),
  primary key (booking_id, kind, ref)
);

alter table public.booking_notices enable row level security;
revoke all on public.booking_notices from anon, authenticated;

-- How many years orders stay in the archive after the event ends. Mirrored in src/lib/eventArchive.ts.
create or replace function public.event_archive_until(p_event public.culture_events)
returns timestamptz
language sql
stable
set search_path = ''
as $fn$
  select coalesce(p_event.end_date, p_event.event_date) + interval '3 years';
$fn$;

create or replace function public.event_has_ticket_history(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.bookings b
    where b.event_id = p_event_id and b.status not in ('expired', 'cancelled')
  ) or exists (
    select 1 from public.payments p join public.bookings b on b.id = p.booking_id
    where b.event_id = p_event_id and p.status in ('processing', 'success', 'refund_pending', 'refunded')
  );
$fn$;

revoke all on function public.event_has_ticket_history(uuid) from public, anon;
grant execute on function public.event_has_ticket_history(uuid) to authenticated;

create or replace function public.guard_event_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if public.event_archive_until(old) > now() and public.event_has_ticket_history(old.id) then
    raise exception 'event_has_tickets' using errcode = 'P0001';
  end if;
  return old;
end;
$fn$;

create trigger culture_events_guard_delete
  before delete on public.culture_events
  for each row execute function public.guard_event_delete();

create or replace function public.cancel_event(p_event_id uuid, p_reason text)
returns table (cancelled_holds int, annulled_free int)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_event public.culture_events;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_note text;
  v_holds int;
  v_free int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_event from public.culture_events where id = p_event_id for update;
  if v_event.id is null or not public.is_staff_of(v_event.organization_id) then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'already_cancelled' using errcode = '22023';
  end if;
  if (now() at time zone 'Asia/Almaty')::date > (v_event.event_date at time zone 'Asia/Almaty')::date then
    raise exception 'event_finished' using errcode = '22023';
  end if;
  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;
  v_note := 'Мероприятие отменено' || coalesce(': ' || v_reason, '');

  update public.culture_events
  set cancelled_at = now(), cancel_reason = v_reason, updated_at = now()
  where id = v_event.id;

  -- Unpaid holds: the seats go back, the order can no longer be paid.
  with c as (
    update public.bookings
    set status = 'cancelled', expires_at = null, resolution_note = v_note, updated_at = now()
    where event_id = v_event.id and status in ('pending', 'payment_reported')
    returning id, organization_id, total_amount
  ), released as (
    update public.booking_items bi set released_at = now()
    from c where bi.booking_id = c.id and bi.released_at is null
    returning bi.id
  ), logged as (
    insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
    select c.id, c.organization_id, 'cancelled', auth.uid(), c.total_amount, v_note from c
    returning booking_id
  )
  select count(*) into v_holds from logged;

  -- Free orders: no money moved, the tickets stop working.
  with f as (
    update public.bookings b
    set status = 'refunded', refunded_at = now(), refunded_by = auth.uid(), resolution_note = v_note, updated_at = now()
    where b.event_id = v_event.id and b.status = 'confirmed' and b.total_amount = 0
      and not exists (
        select 1 from public.payments p
        where p.booking_id = b.id and p.status in ('processing', 'success', 'refund_pending')
      )
    returning b.id, b.organization_id, b.total_amount
  ), released as (
    update public.booking_items bi set released_at = now()
    from f where bi.booking_id = f.id and bi.released_at is null
    returning bi.id
  ), logged as (
    insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
    select f.id, f.organization_id, 'refunded', auth.uid(), f.total_amount, v_note from f
    returning booking_id
  )
  select count(*) into v_free from logged;

  return query select v_holds, v_free;
end;
$fn$;

revoke all on function public.cancel_event(uuid, text) from public, anon;
grant execute on function public.cancel_event(uuid, text) to authenticated;

create or replace function public.move_event(p_event_id uuid, p_new_date timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_event public.culture_events;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_event from public.culture_events where id = p_event_id for update;
  if v_event.id is null or not public.is_staff_of(v_event.organization_id) then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'event_cancelled' using errcode = '22023';
  end if;
  if v_event.event_date < now() then
    raise exception 'event_finished' using errcode = '22023';
  end if;
  if p_new_date is null or p_new_date <= now() then
    raise exception 'date_in_past' using errcode = '22023';
  end if;
  if p_new_date = v_event.event_date then
    raise exception 'same_date' using errcode = '22023';
  end if;

  update public.culture_events
  set moved_from = coalesce(moved_from, event_date),
      end_date = case when end_date is null then null else end_date + (p_new_date - event_date) end,
      event_date = p_new_date,
      updated_at = now()
  where id = v_event.id;

  return 'moved';
end;
$fn$;

revoke all on function public.move_event(uuid, timestamptz) from public, anon;
grant execute on function public.move_event(uuid, timestamptz) to authenticated;

-- The buying function: only a published event that has not been cancelled is sold.
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
  v_event_status text;
  v_cancelled_at timestamptz;
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

  select e.organization_id, e.hall_id, e.event_date, e.status, e.cancelled_at
  into v_org_id, v_hall_id, v_event_date, v_event_status, v_cancelled_at
  from public.culture_events e where e.id = p_event_id;

  if v_org_id is null then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event_status <> 'published' or v_cancelled_at is not null then
    raise exception 'event_unavailable' using errcode = '22023';
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

-- The name-and-phone booking of before 11.11.2026: the site no longer calls it.
revoke execute on function public.create_booking(uuid, text, text, uuid[]) from public, anon, authenticated;
