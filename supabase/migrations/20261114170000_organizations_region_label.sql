-- The district and region line in the site's footer («Жылыой ауданы, Атырау облысы»), from the
-- institution's card instead of the code (Настройки → Контакты). Free text in both languages: the
-- regions table groups institutions for regional admins and is not worded for visitors.
--
-- No grants change: read and edited with the rest of the card.

alter table public.organizations add column if not exists region_label_kk text;
alter table public.organizations add column if not exists region_label_ru text;

comment on column public.organizations.region_label_kk is 'District and region in the site footer (Kazakh).';
comment on column public.organizations.region_label_ru is 'District and region in the site footer (Russian).';

update public.organizations
set region_label_kk = coalesce(region_label_kk, 'Жылыой ауданы, Атырау облысы'),
    region_label_ru = coalesce(region_label_ru, 'Жылыойский район, Атырауская область')
where slug = 'ken-zhylyoi';
