-- =====================================================================
-- telegram_booking_action — кнопки «Подтвердить оплату» / «Отклонить»
-- в Telegram-уведомлении кассира
--
-- Кассир нажимает кнопку в личном чате с ботом; Telegram сообщает об этом
-- сайту (вебхук), сайт вызывает эту функцию своим служебным ключом. Входа
-- в админку тут нет, поэтому право проверяется иначе: нажать может только
-- тот чат, который подключён кассиром учреждения этого заказа
-- (org_telegram.chat_id, уведомления включены).
--
-- Делает ровно то же, что confirm_booking_manual и reject_booking, с теми же
-- проверками (бронь не истекла, мероприятие не прошло, повторное нажатие —
-- ничего), и пишет журнал booking_actions с пометкой «через Telegram».
-- Существующие функции и таблицы не меняются.
--
-- Вызывать может только служебная роль сайта (service_role), не посетитель
-- и не сотрудник из браузера.
-- =====================================================================

create or replace function public.telegram_booking_action(p_booking_id uuid, p_chat_id text, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_book public.bookings;
  v_event public.culture_events;
begin
  if p_action not in ('confirm', 'reject') then
    return 'bad_action';
  end if;

  select * into v_book from public.bookings where id = p_booking_id for update;
  if v_book.id is null then
    return 'not_found';
  end if;

  -- Только подключённый кассир учреждения этого заказа.
  if not exists (
    select 1 from public.org_telegram t
    where t.organization_id = v_book.organization_id
      and t.is_enabled
      and t.chat_id is not null
      and t.chat_id = p_chat_id
  ) then
    return 'not_allowed';
  end if;

  -- Прошедшее или архивное мероприятие закрыто для изменений, как в админке.
  select * into v_event from public.culture_events where id = v_book.event_id;
  if v_event.status = 'archived' or (v_event.event_date is not null and v_event.event_date < now()) then
    return 'event_finished';
  end if;

  if p_action = 'confirm' then
    if v_book.status = 'confirmed' then
      return 'already_confirmed';
    end if;
    if v_book.status not in ('pending', 'payment_reported') then
      return v_book.status;
    end if;
    if v_book.expires_at is not null and v_book.expires_at < now() then
      perform public.expire_stale_booking(v_book.id);
      return 'expired';
    end if;

    update public.bookings
    set status = 'confirmed', confirmed_at = now(), confirmed_by = null, expires_at = null, updated_at = now()
    where id = v_book.id;

    update public.booking_items set ticket_code = gen_random_uuid()
    where booking_id = v_book.id and released_at is null;

    insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
    values (v_book.id, v_book.organization_id, 'confirmed', null, v_book.total_amount, 'через Telegram');

    return 'confirmed';
  end if;

  -- reject
  if v_book.status = 'rejected' then
    return 'already_rejected';
  end if;
  if v_book.status not in ('pending', 'payment_reported', 'expired') then
    return v_book.status;
  end if;

  update public.bookings
  set status = 'rejected', rejected_at = now(), rejected_by = null,
      resolution_note = coalesce(resolution_note, 'Отклонено в Telegram'), expires_at = null, updated_at = now()
  where id = v_book.id;

  update public.booking_items set released_at = now()
  where booking_id = v_book.id and released_at is null;

  insert into public.booking_actions (booking_id, organization_id, action, actor_id, amount, note)
  values (v_book.id, v_book.organization_id, 'rejected', null, v_book.total_amount, 'через Telegram');

  return 'rejected';
end;
$fn$;

revoke all on function public.telegram_booking_action(uuid, text, text) from public;
revoke all on function public.telegram_booking_action(uuid, text, text) from anon, authenticated;
grant execute on function public.telegram_booking_action(uuid, text, text) to service_role;

comment on function public.telegram_booking_action(uuid, text, text) is
  'Кнопки «Подтвердить оплату» / «Отклонить» в Telegram кассира. Только service_role; право — совпадение chat_id с org_telegram учреждения заказа.';
