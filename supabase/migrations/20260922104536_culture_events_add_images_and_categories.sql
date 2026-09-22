-- =====================================================================
-- culture_events: фотографии, полный текст, несколько категорий
--
-- Базовый набор колонок платформы включает images jsonb — тот же формат,
-- что у culture_clubs: [{ "url": "...", "path": "..." }]. Это позволяет
-- переиспользовать загрузчик и серверные действия из раздела кружков
-- без изменений.
--
-- categories text[] вместо одной category: на афише у мероприятия бывает
-- несколько категорий и фильтр отбирает по ним. Старая колонка category
-- остаётся нетронутой — удаление колонки разрушающее и делается отдельно.
-- =====================================================================

begin;

alter table public.culture_events
  add column if not exists images       jsonb  not null default '[]'::jsonb,
  add column if not exists full_text_kk text,
  add column if not exists full_text_ru text,
  add column if not exists categories   text[] not null default '{}'::text[];

-- Фильтр афиши отбирает по вхождению в массив.
create index if not exists idx_culture_events_categories
  on public.culture_events using gin (categories);

commit;
