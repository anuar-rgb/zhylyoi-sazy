-- =====================================================================
-- Частичный возврат билетов и восстановление прав на функции
-- =====================================================================
--
-- 1. Частичный возврат. Кассир может вернуть деньги не за весь заказ, а
--    за выбранные места. Деньги возвращает банк (Halyk ePay принимает
--    сумму возврата), а эта функция записывает результат: места
--    освобождаются, их билеты перестают действовать, сумма возврата
--    копится в payments.refunded_amount и bookings.refunded_amount.
--    Когда возвращено последнее место, заказ и оплата становятся
--    «возвращёнными» целиком.
--
--    Порядок как у полного возврата: сначала банк подтверждает возврат,
--    потом вызывается apply_partial_refund. Функция сама проверяет, что
--    места принадлежат заказу, ещё действуют и сумма не превышает
--    оплаченную, поэтому повторный вызов с теми же местами ничего не
--    меняет.
--
-- 2. Права на функции. При переносе базы на свой сервер (09.11.2026)
--    стандартные настройки Supabase снова выдали anon и authenticated
--    право вызывать все функции, в том числе settle_payment и
--    apply_refund. Здесь повторены revoke/grant из прежних миграций,
--    чтобы права стали такими, как задумано: служебные функции — только
--    service_role.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Частичный возврат
-- ---------------------------------------------------------------------
alter table public.booking_items add column if not exists refunded_at timestamptz;
alter table public.bookings add column if not exists refunded_amount numeric(10, 2) not null default 0;
alter table public.payments add column if not exists refunded_amount numeric(10, 2) not null default 0;

comment on column public.booking_items.refunded_at is
  'Деньги за это место возвращены (частичный возврат). released_at тогда тоже заполнен: билет не действует, место снова в продаже.';
comment on column public.bookings.refunded_amount is
  'Сколько денег по заказу уже возвращено частичными возвратами.';
comment on column public.payments.refunded_amount is
  'Сколько из этой оплаты банк уже вернул частичными возвратами. Полный возврат оставшегося — apply_refund.';

alter table public.booking_actions drop constraint if exists booking_actions_action_check;
alter table public.booking_actions add constraint booking_actions_action_check
  check (action in ('reported', 'confirmed', 'rejected', 'late', 'issued_late', 'refunded', 'cancelled', 'partially_refunded'));

create or replace function public.apply_partial_refund(p_payment_id uuid, p_item_ids uuid[], p_actor uuid default null)
returns table (result text, refunded_amount numeric, refunded_booking_id uuid)
language plpgsql
security definer
set search_path = ''
as $fn$
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
  values (book.id, book.organization_id, 'partially_refunded', p_actor, v_amount, cardinality(v_ids)::text || ' мест');

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

comment on function public.apply_partial_refund(uuid, uuid[], uuid) is
  'Записывает частичный возврат после того, как банк вернул деньги за выбранные места. Только service_role.';

-- ---------------------------------------------------------------------
-- 2. Права на функции, как в прежних миграциях
-- ---------------------------------------------------------------------
revoke all on function public.apply_partial_refund(uuid, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.apply_partial_refund(uuid, uuid[], uuid) to service_role;

-- Служебные: только сервер.
revoke all on function public.apply_refund(uuid) from public, anon, authenticated;
revoke all on function public.settle_payment(uuid, numeric, text, text) from public, anon, authenticated;
revoke all on function public.next_payment_invoice_seq() from public, anon, authenticated;
revoke all on function public.telegram_booking_action(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_refund(uuid) to service_role;
grant execute on function public.settle_payment(uuid, numeric, text, text) to service_role;
grant execute on function public.next_payment_invoice_seq() to service_role;
grant execute on function public.telegram_booking_action(uuid, text, text) to service_role;

-- Помощники правил доступа и триггеры: не для гостей.
revoke all on function public.can_manage_org(uuid) from public, anon;
revoke all on function public.current_org_id() from public, anon;
revoke all on function public.current_region_id() from public, anon;
revoke all on function public.current_role_name() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_same_region_as_current(uuid) from public, anon;
revoke all on function public.is_staff_of(uuid) from public, anon;
revoke all on function public.try_uuid(text) from public, anon;
revoke all on function public.profiles_guard_privileged_columns() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_region_id() to authenticated;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_same_region_as_current(uuid) to authenticated;
grant execute on function public.is_staff_of(uuid) to authenticated;
grant execute on function public.try_uuid(text) to authenticated;

-- Действия сотрудников: только вошедшие (каждая функция сама проверяет учреждение).
revoke all on function public.block_event_seats(uuid, uuid[], text, text) from public, anon;
revoke all on function public.unblock_event_seats(uuid, uuid[]) from public, anon;
revoke all on function public.check_in_ticket(uuid, uuid) from public, anon;
revoke all on function public.confirm_booking_manual(uuid, text) from public, anon;
revoke all on function public.reject_booking(uuid, text) from public, anon;
revoke all on function public.mark_booking_late(uuid, text, text) from public, anon;
revoke all on function public.issue_late_booking(uuid) from public, anon;
revoke all on function public.mark_booking_refunded(uuid, text) from public, anon;
revoke all on function public.staff_booking_for_update(uuid) from public, anon, authenticated;
grant execute on function public.block_event_seats(uuid, uuid[], text, text) to authenticated;
grant execute on function public.unblock_event_seats(uuid, uuid[]) to authenticated;
grant execute on function public.check_in_ticket(uuid, uuid) to authenticated;
grant execute on function public.confirm_booking_manual(uuid, text) to authenticated;
grant execute on function public.reject_booking(uuid, text) to authenticated;
grant execute on function public.mark_booking_late(uuid, text, text) to authenticated;
grant execute on function public.issue_late_booking(uuid) to authenticated;
grant execute on function public.mark_booking_refunded(uuid, text) to authenticated;

-- Покупателю: по секретной ссылке заказа и для выбора мест.
revoke all on function public.create_booking(uuid, text, text, uuid[]) from public;
revoke all on function public.get_booking_by_token(uuid) from public;
revoke all on function public.get_taken_seats(uuid) from public;
revoke all on function public.cancel_booking_by_token(uuid) from public;
revoke all on function public.report_booking_payment(uuid) from public;
grant execute on function public.create_booking(uuid, text, text, uuid[]) to anon, authenticated;
grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;
grant execute on function public.get_taken_seats(uuid) to anon, authenticated;
grant execute on function public.cancel_booking_by_token(uuid) to anon, authenticated;
grant execute on function public.report_booking_payment(uuid) to anon, authenticated;

-- Внутренние: вызываются из других функций и триггеров.
revoke all on function public.expire_stale_booking(uuid) from public, anon, authenticated;
revoke all on function public.expire_stale_bookings_for_event(uuid) from public, anon, authenticated;
revoke all on function public.recalc_hall_capacity() from public, anon, authenticated;
revoke all on function public.check_event_payment_method_org() from public, anon, authenticated;
