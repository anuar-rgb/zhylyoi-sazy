-- =====================================================================
-- apply_partial_refund: исправление
-- =====================================================================
-- В функции из 20261109150000 имя refunded_amount — и выходной столбец,
-- и столбец таблиц payments/bookings, поэтому UPDATE падал с ошибкой
-- «column reference is ambiguous» (возврат не записывался, ничего не
-- менялось). Директива #variable_conflict use_column говорит, что имеется в
-- виду столбец таблицы. Запись в журнале теперь «мест: N». Остальное без изменений; права сохраняются.
-- =====================================================================

create or replace function public.apply_partial_refund(p_payment_id uuid, p_item_ids uuid[], p_actor uuid default null)
returns table (result text, refunded_amount numeric, refunded_booking_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
-- refunded_amount is both an output column and a table column: the table's is meant.
declare
  pay public.payments%rowtype;
  book public.bookings%rowtype;
  v_ids uuid[] := array(select distinct unnest(coalesce(p_item_ids, '{}'::uuid[])));
  v_found int;
  v_amount numeric(10, 2);
  v_left int;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    return query select 'unknown_payment'::text, 0::numeric, null::uuid;
    return;
  end if;
  if pay.status <> 'success' then
    return query select 'not_refundable'::text, 0::numeric, pay.booking_id;
    return;
  end if;

  select * into book from public.bookings where id = pay.booking_id for update;
  if book.status <> 'confirmed' then
    return query select 'not_refundable'::text, 0::numeric, pay.booking_id;
    return;
  end if;
  if cardinality(v_ids) = 0 then
    return query select 'nothing_to_refund'::text, 0::numeric, pay.booking_id;
    return;
  end if;

  -- Every chosen seat must be this order's and still valid; otherwise nothing changes.
  select count(*), coalesce(sum(bi.price_at_booking), 0) into v_found, v_amount
  from public.booking_items bi
  where bi.booking_id = book.id and bi.id = any (v_ids) and bi.released_at is null;
  if v_found <> cardinality(v_ids) then
    return query select 'items_not_refundable'::text, 0::numeric, pay.booking_id;
    return;
  end if;
  if pay.refunded_amount + v_amount > pay.amount then
    return query select 'amount_exceeds_payment'::text, 0::numeric, pay.booking_id;
    return;
  end if;

  update public.booking_items
  set released_at = now(), refunded_at = now()
  where booking_id = book.id and id = any (v_ids);

  update public.payments set refunded_amount = refunded_amount + v_amount, updated_at = now() where id = pay.id;
  update public.bookings set refunded_amount = refunded_amount + v_amount, updated_at = now() where id = book.id;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
  values (book.id, book.organization_id, 'partially_refunded', p_actor, v_amount, 'мест: ' || cardinality(v_ids)::text);

  select count(*) into v_left from public.booking_items where booking_id = book.id and released_at is null;
  if v_left = 0 then
    update public.payments set status = 'refunded', refunded_at = now(), needs_refund = false where id = pay.id;
    update public.bookings set status = 'refunded', refunded_at = now(), refunded_by = p_actor, updated_at = now() where id = book.id;
    return query select 'refunded_all'::text, v_amount, book.id;
    return;
  end if;

  return query select 'refunded_partly'::text, v_amount, book.id;
end;
$fn$;
