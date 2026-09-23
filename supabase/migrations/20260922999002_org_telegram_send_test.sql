-- =====================================================================
-- org_telegram — отправка из базы и кнопка «Проверить»
--
-- Отправку переносим из Next.js в Postgres, потому что токен теперь
-- принадлежит учреждению, а отправку запускает анонимный посетитель,
-- отправивший форму. Читай токен приложение — пришлось бы держать в
-- окружении сервера ключ, обходящий RLS, ради одной строки. Здесь токен
-- не покидает базу.
--
-- pg_net, а не http: он асинхронный и, по документации, ставит запрос в
-- очередь и отправляет его ТОЛЬКО ПОСЛЕ ФИКСАЦИИ транзакции. Отсюда два
-- нужных следствия: вставка заявки не ждёт Telegram, и заявка, которая не
-- сохранилась, уведомления не породит.
--
-- Здесь только проверочная отправка. Триггер на заявки идёт отдельной
-- миграцией, одновременно с выкаткой кода без notifyTelegram: иначе какое-то
-- время сообщение слали бы и приложение, и база.
--
-- Проверено на откате перед применением: security definer функция читает
-- org_telegram от имени anon (1 строка), тогда как прямое чтение тем же
-- anon даёт 42501 permission denied.
-- =====================================================================

begin;

-- Создаёт собственную схему net; with schema extensions здесь неприменимо.
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- Кнопка «Проверить» в настройках
--
-- Без неё учреждение вставляет токен и не знает, верен ли он: первая
-- настоящая заявка — плохой момент это выяснять.
--
-- security definer нужен ради доступа к схеме net, поэтому права проверяются
-- первой же строкой тела: can_manage_org того учреждения, чей бот дёргают.
-- Без этой проверки любой вошедший смог бы слать сообщения чужим ботом.
-- ---------------------------------------------------------------------
create or replace function public.org_telegram_send_test(org uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  token text;
  chat  text;
begin
  if not public.can_manage_org(org) then
    return 'denied';
  end if;

  select t.bot_token, t.chat_id
    into token, chat
    from public.org_telegram t
   where t.organization_id = org
     and t.is_enabled = true;

  if token is null or chat is null then
    return 'not_configured';
  end if;

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || token || '/sendMessage',
    body    := jsonb_build_object(
                 'chat_id', chat,
                 'text', E'✅ Тексеру хабарламасы / Проверочное сообщение\nБот дұрыс бапталған / Бот настроен верно.'
               ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return 'sent';
end;
$fn$;

comment on function public.org_telegram_send_test(uuid) is
  'Шлёт проверочное сообщение в Telegram учреждения. Возвращает sent, not_configured или denied.';

-- Поимённо: alter default privileges в Supabase выдаёт EXECUTE на каждую новую
-- функцию всем ролям, и revoke from public этого не снимает. anon не должен
-- иметь возможности дёргать отправку чужим ботом даже вхолостую.
revoke all on function public.org_telegram_send_test(uuid) from public;
revoke all on function public.org_telegram_send_test(uuid) from anon;
grant execute on function public.org_telegram_send_test(uuid) to authenticated;

commit;
