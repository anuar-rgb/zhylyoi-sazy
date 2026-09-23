-- =====================================================================
-- culture_clubs — поля, без которых коллектив не отличить от кружка
--
-- kind = 'creative_collective' существует с самого начала, но ни одного
-- коллектива в таблице не было: ансамбль и театр жили в коде. Теперь они
-- переезжают сюда, и им нужны три вещи, которых у кружка нет.
--
--   founded_year   — «основан в 1957», год на карточке коллектива.
--   is_honored     — звание «Народный». Отдельный флаг, а не слово в описании:
--                    по нему строится страница /honored, и искать там вхождение
--                    слова в текст значило бы потерять коллектив от опечатки.
--   honored_since  — год присвоения. У театра 2008, у ансамбля пока неизвестен,
--                    при этом само звание есть — поэтому год отдельно от флага.
--
-- ХАРАКТЕР ОПЕРАЦИИ. Только ALTER TABLE ADD COLUMN. Ничего не удаляется и не
-- переименовывается, данные кружков не затрагиваются, RLS не меняется:
-- политики на culture_clubs на эти поля не ссылаются.
-- =====================================================================

begin;

alter table public.culture_clubs
  add column if not exists founded_year integer;

alter table public.culture_clubs
  add column if not exists is_honored boolean not null default false;

alter table public.culture_clubs
  add column if not exists honored_since integer;

comment on column public.culture_clubs.founded_year is
  'Год основания коллектива. У кружков обычно пусто.';
comment on column public.culture_clubs.is_honored is
  'Звание «Народный» (үлгілі). По нему собирается страница /honored.';
comment on column public.culture_clubs.honored_since is
  'Год присвоения звания. Пусто, если год неизвестен, — само звание при этом может быть.';

-- Частичный: страница /honored спрашивает только про удостоенных.
create index if not exists idx_culture_clubs_honored
  on public.culture_clubs (organization_id, is_active)
  where is_honored;

commit;
