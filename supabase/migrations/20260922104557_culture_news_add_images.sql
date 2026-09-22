-- =====================================================================
-- culture_news: фотографии
--
-- Тот же формат, что у culture_clubs и culture_events:
-- [{ "url": "...", "path": "..." }]. Первая фотография — обложка.
-- Колонка cover_image_url остаётся нетронутой: удаление колонки
-- разрушающее и делается отдельным шагом.
-- =====================================================================

begin;

alter table public.culture_news
  add column if not exists images jsonb not null default '[]'::jsonb;

commit;
