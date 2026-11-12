-- The institution's official requisites and its map point live on its card, next to the address,
-- phone and email, so staff edit all of them in one place (Админка → Настройки) and every page reads
-- them from there. Until now the BIN and the map point were written in the code and the full name,
-- director and founder were site texts.
--
-- All public facts about the institution: readable through the existing organizations_public_read
-- policy, written through organizations_admin_update like the other card fields.

alter table public.organizations
  add column if not exists legal_name_kk text,
  add column if not exists legal_name_ru text,
  add column if not exists bin text,
  add column if not exists director text,
  add column if not exists founder_kk text,
  add column if not exists founder_ru text,
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

alter table public.organizations
  drop constraint if exists organizations_bin_check,
  add constraint organizations_bin_check check (bin is null or bin ~ '^[0-9]{12}$'),
  drop constraint if exists organizations_legal_text_check,
  add constraint organizations_legal_text_check check (
    coalesce(length(legal_name_kk), 0) <= 500 and coalesce(length(legal_name_ru), 0) <= 500
    and coalesce(length(director), 0) <= 200
    and coalesce(length(founder_kk), 0) <= 500 and coalesce(length(founder_ru), 0) <= 500
  ),
  drop constraint if exists organizations_map_point_check,
  add constraint organizations_map_point_check check (
    (map_lat is null and map_lng is null)
    or (map_lat between -90 and 90 and map_lng between -180 and 180)
  );

-- The values the site showed until now, for the one institution it serves.
update public.organizations
set
  legal_name_kk = coalesce(legal_name_kk, '«Кең Жылыой» Жылыой аудандық мәдениет үйі» коммуналдық мемлекеттік қазыналық кәсіпорыны'),
  legal_name_ru = coalesce(legal_name_ru, 'Коммунальное государственное казенное предприятие «Жылыойский районный дом культуры «Кен Жылыой»»'),
  bin = coalesce(bin, '010240004070'),
  director = coalesce(director, 'Темирханов Алибек Жумаханович'),
  founder_kk = coalesce(founder_kk, 'Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімі'),
  founder_ru = coalesce(founder_ru, 'Отдел культуры, развития языков, физической культуры и спорта Жылыойского района'),
  map_lat = coalesce(map_lat, 46.9621483),
  map_lng = coalesce(map_lng, 54.0129176)
where slug = 'ken-zhylyoi';
