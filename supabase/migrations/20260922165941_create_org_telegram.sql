-- =====================================================================
-- org_telegram — свой Telegram у каждого учреждения
--
-- Сейчас бот задан переменными окружения TELEGRAM_BOT_TOKEN и
-- TELEGRAM_CHAT_ID — одна пара на весь сервер. Это значит, что заявки
-- второго учреждения полетели бы в Telegram первого. Не утечка данных,
-- а просто неработающая мультиарендность: переменная одна, учреждений много.
--
-- Токен — секрет, и положить его в organizations нельзя: политика
-- organizations_public_read отдаёт anon все колонки активного учреждения
-- (for select to anon, authenticated using (is_active = true)). Колонка с
-- токеном там стала бы публичной.
--
-- Поэтому отдельная таблица, у которой anon не имеет ни прав, ни политики.
-- Читает и пишет только тот, кто управляет этим учреждением.
--
-- Ключ — organization_id: один набор настроек на учреждение, без отдельного
-- id и без возможности завести два конфликтующих.
-- =====================================================================

begin;

create table if not exists public.org_telegram (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  bot_token       text,
  chat_id         text,
  is_enabled      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.org_telegram is
  'Бот Telegram учреждения для уведомлений о заявках. Секрет: публичного чтения нет ни при каких условиях.';
comment on column public.org_telegram.bot_token is
  'Токен бота от @BotFather. Пусто — уведомления не отправляются.';
comment on column public.org_telegram.chat_id is
  'Куда слать: идентификатор чата, группы или канала.';
comment on column public.org_telegram.is_enabled is
  'Выключатель, не стирающий настройки: снять галочку и вернуть, не вводя токен заново.';

-- Поимённо, потому что alter default privileges в Supabase раздаёт все права
-- anon и authenticated на каждую новую таблицу, включая TRUNCATE, который RLS
-- не ограничивает. revoke from public этого не снимает.
revoke all on public.org_telegram from anon;
revoke all on public.org_telegram from authenticated;

-- anon не получает ничего: ни select, ни чего-либо ещё. Посетитель сайта
-- создаёт заявку, но токен бота ему недоступен ни на каком уровне.
grant select, insert, update, delete on public.org_telegram to authenticated;

alter table public.org_telegram enable row level security;

-- Одна политика на всё: кто управляет учреждением, тот и распоряжается его
-- ботом. Отдельной политики чтения для сотрудника нет намеренно — токен не
-- нужен тому, кто не может его сменить.
drop policy if exists org_telegram_admin_all on public.org_telegram;
create policy org_telegram_admin_all on public.org_telegram
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

commit;
