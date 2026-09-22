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
