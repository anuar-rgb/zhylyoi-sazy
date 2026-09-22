<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Развёртывание на Railway

Приложение запускается **напрямую через node**, а не через `npm run start`.
Команда задана в `railway.json` → `deploy.startCommand`.

Причина: при выкатке новой версии Railway гасит старый контейнер сигналом
`SIGTERM`. Если процессом верхнего уровня оказывается npm, он не завершается
тихо — печатает `npm error command failed / signal SIGTERM` и выходит с
ненулевым кодом. Railway считает это падением и присылает письмо
«Deploy Crashed» на каждый деплой, хотя ничего не падало.

Когда сигнал приходит самому Next, он доводит текущие запросы до конца и
выходит с кодом 0 — это описано в `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`.

Не заменяйте `startCommand` на `npm run start` и не удаляйте `railway.json`
«за ненадобностью» — письма вернутся.

# Платформа культуры Атырауской области

Проект — не сайт одного Дома культуры, а платформа для учреждений области:
домов культуры, библиотек, спортотделов. Всё ниже вытекает из этого.

## Именование таблиц контента

Таблицы контента называются **`{домен}_{сущность}`**, никогда просто
`{сущность}`. Домен — тип учреждения или направление внутри него: `culture`,
`library`, `sport`.

    culture_clubs    culture_events    culture_news
    library_reading_groups (когда появится)

Разные сущности живут в разных таблицах, а не в одной с полем-признаком: иначе
поля одной сущности начинают мешать другой.

Миграции называются по имени таблицы: `..._create_culture_clubs.sql`, а не
`..._clubs_add_something.sql`.

## Базовый набор колонок

Новая таблица контента повторяет форму уже существующих:

    id, organization_id, slug, name_kk/name_ru (или title_kk/title_ru),
    description_kk/description_ru, images jsonb, is_active или status,
    created_at, updated_at

Физически таблицы разные, но одинаковые по форме — это позволяет переиспользовать
RLS-политики, серверные действия и компоненты формы почти без изменений.

Всё, что видит посетитель, **локализуется парой колонок** `*_kk` / `*_ru`.
Переключатель языка в шапке ничего не переводит, он выбирает сохранённый текст.
Одна колонка означает, что одна из версий сайта покажет чужой язык. Служебная
колонка без суффикса (`name`, `title`) остаётся NOT NULL и служит запасной.

## Права на новую таблицу

Supabase настраивает `alter default privileges ... grant all ... to anon,
authenticated`, поэтому **каждая новая таблица создаётся с полными правами для
anon и authenticated**, включая TRUNCATE, который RLS не ограничивает.
`revoke ... from public` этого не снимает: права выданы явно ролям.

Каждая миграция, создающая таблицу, обязана содержать:

    revoke all on public.<таблица> from anon;
    revoke all on public.<таблица> from authenticated;
    grant select on public.<таблица> to anon;              -- если публичная
    grant select, insert, update, delete ... to authenticated;

Образец — `20260917182152_harden_default_privileges.sql`.

## RLS

RLS **фильтрует строки, а не отклоняет запрос**. Вызов без прав меняет ноль строк
и не возвращает ошибку. Поэтому каждый UPDATE и DELETE из кода идёт с
`{ count: "exact" }`, и успех определяется по числу строк, а не по отсутствию
ошибки. Иначе отказ выглядит как успех.

Публичные запросы **обязаны фильтровать по `organization_id`**. Политики чтения
публикуют записи всех учреждений платформы; выбирать, чьи показывает этот сайт, —
работа приложения, а не RLS.

## Админка не локализована

`src/middleware.ts` отправляет `/admin` через Supabase-аутентификацию мимо
next-intl, и у админки свой корневой layout без провайдера. Импорт
`@/i18n/navigation`, `next-intl` или `next-intl/server` внутри `src/app/admin/**`
падает с `No intl context found` — и только у вошедшего пользователя, потому что
анонимного разворачивают раньше рендера. В админке — `next/link` и
`next/navigation`. Правило ESLint это проверяет.

## Время

Сервер живёт по UTC, учреждение — по Атырау (UTC+5). Даты мероприятий и новостей
читаются и пишутся через `src/lib/eventFields.ts`; не разбирайте `datetime-local`
напрямую, иначе афиша сдвинется на пять часов.

## Миграции

Supabase ставит отметку времени в момент применения. После применения переименуйте
локальный файл под фактическую версию из `list_migrations`, иначе история
разойдётся с репозиторием.

Уже применённые файлы не переименовывать и не править.
