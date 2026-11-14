-- Part 4 of «one site, many institutions»: what is «Кең Жылыой»'s own in the site's pages.
--
-- sections: the optional pages and blocks an institution shows. They came from the ensemble that
-- started this site, so a new institution starts with none of them and switches on what it has
-- (Настройки → «Разделы сайта»):
--   honored  — the «Народный» collectives page and its menu item
--   zhastar  — the «Жастар» theatre page (its text and photos are «Кең Жылыой»'s own)
--   about    — the «Об ансамбле» page
--   plan     — the development plan page
--   gallery  — the home page's photo and video block (its photos are «Кең Жылыой»'s own)
-- «Кең Жылыой» keeps all of them, as today.
--
-- hero_image_url / hero_image_mobile_url: the picture on the home page's first screen and in its
-- «О нас» block, a wide one and an upright one for phones (the wide one when empty). With none,
-- the first screen is the site's colour. «Кең Жылыой» keeps its building; the files moved to
-- public/images/orgs/ken-zhylyoi/.
--
-- No grants change: read with the rest of the card (anon reads active institutions) and edited by
-- the institution's admin like its other card fields.

alter table public.organizations add column if not exists sections text[] not null default '{}';
alter table public.organizations drop constraint if exists organizations_sections_known;
alter table public.organizations add constraint organizations_sections_known
  check (sections <@ array['honored', 'zhastar', 'about', 'plan', 'gallery']::text[]);

alter table public.organizations add column if not exists hero_image_url text;
alter table public.organizations add column if not exists hero_image_mobile_url text;

comment on column public.organizations.sections is
  'Optional pages and blocks the institution shows: honored, zhastar, about, plan, gallery.';
comment on column public.organizations.hero_image_url is 'Home page first screen picture (wide).';
comment on column public.organizations.hero_image_mobile_url is 'Home page first screen picture for phones (upright); the wide one when null.';

update public.organizations
set sections = array['honored', 'zhastar', 'about', 'plan', 'gallery']::text[],
    hero_image_url = coalesce(hero_image_url, '/images/orgs/ken-zhylyoi/hero.jpg'),
    hero_image_mobile_url = coalesce(hero_image_mobile_url, '/images/orgs/ken-zhylyoi/hero-mobile.jpg')
where slug = 'ken-zhylyoi';
