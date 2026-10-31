-- =====================================================================
-- event_seat_blocks — места, закрытые от продажи на одно мероприятие
--
-- Кассир закрывает место на схеме в «Заказах»: «Бронь» (держат для особого
-- гостя) или «Неисправно» (сломано кресло). Закрытое место не продаётся и у
-- покупателя выглядит занятым; билета, имени и QR-кода у него нет. Место
-- можно снова открыть. Зал и другие мероприятия это не затрагивает.
--
-- Изменения существующего (согласовано):
--   * get_taken_seats — закрытые места тоже считаются занятыми;
--   * create_booking  — закрытое место нельзя купить (ровно та же функция,
--                       добавлена одна проверка в выборке мест).
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

create table if not exists public.event_seat_blocks (
  event_id   uuid not null references public.culture_events(id) on delete cascade,
  seat_id    uuid not null references public.hall_seats(id) on delete cascade,
  kind       text not null default 'reserved',
  note       text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (event_id, seat_id),
  constraint chk_event_seat_blocks_kind check (kind in ('reserved', 'broken')),
  constraint chk_event_seat_blocks_note check (note is null or length(note) <= 200)
);

comment on table public.event_seat_blocks is
  'Места, закрытые от продажи на одно мероприятие: reserved — бронь для гостя, broken — неисправно. Пишется только функциями.';

-- Сотрудники читают, пишут только функции ниже.
revoke all on public.event_seat_blocks from anon;
revoke all on public.event_seat_blocks from authenticated;
grant select on public.event_seat_blocks to authenticated;

alter table public.event_seat_blocks enable row level security;

drop policy if exists event_seat_blocks_staff_read on public.event_seat_blocks;
create policy event_seat_blocks_staff_read on public.event_seat_blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.culture_events e
      where e.id = event_seat_blocks.event_id and public.is_staff_of(e.organization_id)
    )
  );

-- ---------------------------------------------------------------------
-- Закрыть места. Проданные и удерживаемые (неоплаченная бронь) не трогаются.
-- Возвращает, сколько мест закрыто.
-- ---------------------------------------------------------------------
create or replace function public.block_event_seats(p_event_id uuid, p_seat_ids uuid[], p_kind text, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_event public.culture_events;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_kind not in ('reserved', 'broken') then
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  select * into v_event from public.culture_events where id = p_event_id;
  if v_event.id is null or not public.is_staff_of(v_event.organization_id) then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event.status = 'archived' or (v_event.event_date is not null and v_event.event_date < now()) then
    raise exception 'event_finished' using errcode = '22023';
  end if;

  perform public.expire_stale_bookings_for_event(p_event_id);

  insert into public.event_seat_blocks (event_id, seat_id, kind, note, created_by)
  select p_event_id, hs.id, p_kind, left(v_note, 200), auth.uid()
  from unnest(p_seat_ids) as s(seat_id)
  join public.hall_seats hs on hs.id = s.seat_id and hs.hall_id = v_event.hall_id
  where not exists (
    select 1 from public.booking_items bi
    where bi.event_id = p_event_id and bi.seat_id = hs.id and bi.released_at is null
  )
  on conflict (event_id, seat_id) do update set kind = excluded.kind, note = excluded.note;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

-- Открыть места снова. Возвращает, сколько открыто.
create or replace function public.unblock_event_seats(p_event_id uuid, p_seat_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_event public.culture_events;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_event from public.culture_events where id = p_event_id;
  if v_event.id is null or not public.is_staff_of(v_event.organization_id) then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event.status = 'archived' or (v_event.event_date is not null and v_event.event_date < now()) then
    raise exception 'event_finished' using errcode = '22023';
  end if;

  delete from public.event_seat_blocks where event_id = p_event_id and seat_id = any (p_seat_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke all on function public.block_event_seats(uuid, uuid[], text, text) from public;
revoke all on function public.unblock_event_seats(uuid, uuid[]) from public;
grant execute on function public.block_event_seats(uuid, uuid[], text, text) to authenticated;
grant execute on function public.unblock_event_seats(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- get_taken_seats: закрытые места тоже заняты.
-- ---------------------------------------------------------------------
create or replace function public.get_taken_seats(p_event_id uuid)
returns table(seat_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform public.expire_stale_bookings_for_event(p_event_id);

  return query
    select bi.seat_id
    from public.booking_items bi
    where bi.event_id = p_event_id and bi.released_at is null
    union
    select b.seat_id
    from public.event_seat_blocks b
    where b.event_id = p_event_id;
end;
$fn$;

-- ---------------------------------------------------------------------
-- create_booking: та же функция; добавлена одна проверка — место не закрыто.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(p_event_id uuid, p_buyer_name text, p_buyer_phone text, p_seat_ids uuid[])
returns table(booking_id uuid, access_token uuid, status text, total_amount numeric)
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

commit;
