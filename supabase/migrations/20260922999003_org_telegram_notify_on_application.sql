-- =====================================================================
-- org_telegram — уведомление о заявке шлёт база, а не приложение
--
-- ВНИМАНИЕ К ПОРЯДКУ: эта миграция применяется одновременно с выкаткой
-- кода, где из submitClubApplication убран вызов notifyTelegram. Применить
-- её раньше — и на каждую заявку придёт два одинаковых сообщения.
--
-- Ошибка отправки гасится. Уведомление — удобство, заявка — данные
-- человека: недоступный Telegram не имеет права отменить запись ребёнка в
-- кружок. Прежний код вёл себя так же (notifyTelegram помечен best-effort),
-- поведение сохранено намеренно.
-- =====================================================================

begin;

create or replace function public.org_telegram_notify_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  token text;
  chat  text;
  lines text;
begin
  select t.bot_token, t.chat_id
    into token, chat
    from public.org_telegram t
   where t.organization_id = new.organization_id
     and t.is_enabled = true;

  -- Учреждение не настроило бота — это норма, а не ошибка.
  if token is null or chat is null then
    return new;
  end if;

  lines := concat_ws(
    E'\n',
    '🆕 Жаңа өтінім / Новая заявка',
    'Баланың аты-жөні / ФИО ребёнка: '      || coalesce(new.applicant_name, '—'),
    'Жасы / Возраст: '                      || coalesce(new.applicant_age, '—'),
    'Ата-ана телефоны / Телефон родителя: ' || coalesce(new.applicant_phone, '—'),
    'Үйірме / Кружок: '                     || coalesce(new.club_title, '—'),
    -- concat_ws пропускает NULL, поэтому пустой комментарий не оставляет
    -- висячей строки с одним двоеточием.
    case
      when coalesce(btrim(new.message), '') = '' then null
      else 'Пікір / Комментарий: ' || btrim(new.message)
    end
  );

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || token || '/sendMessage',
    body    := jsonb_build_object('chat_id', chat, 'text', lines),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
exception
  when others then
    -- Заявка важнее уведомления: сообщение теряется, запись остаётся.
    raise warning 'org_telegram: уведомление не отправлено: %', sqlerrm;
    return new;
end;
$fn$;

comment on function public.org_telegram_notify_application() is
  'Триггер на вставку заявки: шлёт уведомление в Telegram учреждения. Ошибки гасит — заявка важнее уведомления.';

-- Поимённо: alter default privileges в Supabase выдаёт EXECUTE на каждую новую
-- функцию всем ролям, и revoke from public этого не снимает. Триггерную функцию
-- не должен уметь вызывать никто напрямую — её зовёт только сам триггер.
revoke all on function public.org_telegram_notify_application() from public;
revoke all on function public.org_telegram_notify_application() from anon;
revoke all on function public.org_telegram_notify_application() from authenticated;

drop trigger if exists applications_notify_telegram on public.applications;
create trigger applications_notify_telegram
  after insert on public.applications
  for each row
  execute function public.org_telegram_notify_application();

commit;
