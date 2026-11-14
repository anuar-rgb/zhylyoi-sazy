-- The institution's name, logo and link preview picture on its site come from its card, not from
-- the code, so every institution's site carries its own (Настройки → «Название на сайте и логотип»).
--
-- short_name_*: the name in the header and footer («Кең Жылыой»), shorter than name_* (the full
--   name, «"Кең Жылыой" Жылыой аудандық мәдениет үйі»), which titles pages and documents.
-- tagline_*: the line under the short name in the header («Жылыой аудандық мәдениет үйі»).
-- logo_url (already there, unused until now): header, footer, the browser tab icon.
-- share_image_url: the picture messengers show for a link to the site; the logo when empty.
--
-- «Кең Жылыой» keeps what its site shows today; its files moved from the code's own icons to
-- public/images/orgs/ken-zhylyoi/.
--
-- No grants change: the columns are read with the rest of the card (anon reads active
-- institutions) and edited by the institution's admin like its other card fields.

alter table public.organizations add column if not exists short_name_kk text;
alter table public.organizations add column if not exists short_name_ru text;
alter table public.organizations add column if not exists tagline_kk text;
alter table public.organizations add column if not exists tagline_ru text;
alter table public.organizations add column if not exists share_image_url text;

comment on column public.organizations.short_name_kk is 'Short name in the site header and footer (Kazakh).';
comment on column public.organizations.short_name_ru is 'Short name in the site header and footer (Russian).';
comment on column public.organizations.tagline_kk is 'Line under the short name in the site header (Kazakh).';
comment on column public.organizations.tagline_ru is 'Line under the short name in the site header (Russian).';
comment on column public.organizations.share_image_url is 'Picture messengers show for a link to the site; the logo when empty.';

update public.organizations
set short_name_kk = coalesce(short_name_kk, 'Кең Жылыой'),
    short_name_ru = coalesce(short_name_ru, 'Кен Жылыой'),
    tagline_kk = coalesce(tagline_kk, 'Жылыой аудандық мәдениет үйі'),
    tagline_ru = coalesce(tagline_ru, 'Дом культуры Жылыойского района'),
    logo_url = coalesce(logo_url, '/images/orgs/ken-zhylyoi/logo.png'),
    share_image_url = coalesce(share_image_url, '/images/orgs/ken-zhylyoi/share.png')
where slug = 'ken-zhylyoi';
