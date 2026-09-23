-- =====================================================================
-- culture_videos — видеозаписи учреждения
--
-- Две записи жили массивом в коде страницы /video, а сами файлы .mp4 лежат в
-- репозитории и весят 24 МБ. Дальше так нельзя: концертная запись весит сотни
-- мегабайт, и хранилище кончится на первой же.
--
-- Поэтому новые записи — ссылки на YouTube. Хранится ИДЕНТИФИКАТОР, а не
-- ссылка целиком: люди вставляют что дал браузер — share-ссылку, адресную
-- строку, ссылку с меткой времени, с плейлистом, с мобильного сайта, — и во
-- всех этих формах лежат одни и те же одиннадцать символов. Разбор делается
-- один раз при сохранении, а не при каждой отрисовке.
--
-- kind существует ради двух уже имеющихся записей. Ссылок на YouTube у них нет,
-- и выбрасывать их ради чистоты схемы значило бы оставить страницу пустой.
-- Они остаются 'file' со ссылкой на файл в приложении; форма создаёт только
-- 'youtube'. Выложит учреждение эти две на YouTube — удалит файловые записи
-- само, и колонка останется рудиментом, который не мешает.
-- =====================================================================

begin;

create table if not exists public.culture_videos (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- Служебная колонка без суффикса остаётся NOT NULL и служит запасной.
  title           text not null,
  title_kk        text,
  title_ru        text,

  description_kk  text,
  description_ru  text,

  -- Подпись на постере: где и когда снято.
  venue_kk        text,
  venue_ru        text,

  kind            text not null default 'youtube',
  youtube_id      text,
  file_path       text,

  sort_order      integer not null default 0,
  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.culture_videos is
  'Видеозаписи для страницы /video. Новые — ссылки на YouTube; kind = file остался у двух записей, перенесённых из кода.';
comment on column public.culture_videos.kind is
  'youtube — встраивается плеер YouTube по youtube_id. file — проигрывается файл из приложения по file_path. CHECK нет намеренно, как у culture_clubs.kind.';
comment on column public.culture_videos.youtube_id is
  'Одиннадцать символов идентификатора, а не ссылка: форму ссылки разбираем один раз при сохранении.';
comment on column public.culture_videos.file_path is
  'Путь к файлу внутри приложения, например /videos/concert-2026.mp4. Только у перенесённых записей.';

create index if not exists idx_culture_videos_org
  on public.culture_videos (organization_id, is_active, sort_order);

-- Поимённо: alter default privileges в Supabase раздаёт все права anon и
-- authenticated на каждую новую таблицу, включая TRUNCATE, который RLS не
-- ограничивает. revoke ... from public этого не снимает.
revoke all on public.culture_videos from anon;
revoke all on public.culture_videos from authenticated;

grant select on public.culture_videos to anon;
grant select, insert, update, delete on public.culture_videos to authenticated;

alter table public.culture_videos enable row level security;

drop policy if exists culture_videos_public_read on public.culture_videos;
create policy culture_videos_public_read on public.culture_videos
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists culture_videos_admin_all on public.culture_videos;
create policy culture_videos_admin_all on public.culture_videos
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

commit;
