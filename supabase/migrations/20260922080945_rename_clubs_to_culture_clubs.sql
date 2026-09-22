-- Правило именования платформы: таблицы контента называются {домен}_{сущность}.
-- ALTER TABLE ... RENAME меняет только имя отношения: политики, индексы,
-- ограничения, триггер и гранты привязаны к OID и переживают переименование.
-- Ниже приводятся в порядок только ИМЕНА зависимых объектов.

alter table public.clubs rename to culture_clubs;

alter table public.culture_clubs rename constraint clubs_pkey to culture_clubs_pkey;
alter table public.culture_clubs rename constraint clubs_organization_id_fkey to culture_clubs_organization_id_fkey;

alter index public.idx_clubs_organization_id rename to idx_culture_clubs_organization_id;
alter index public.idx_clubs_is_active       rename to idx_culture_clubs_is_active;
alter index public.idx_clubs_org_kind        rename to idx_culture_clubs_org_kind;
alter index public.uq_clubs_org_slug         rename to uq_culture_clubs_org_slug;

alter trigger trg_clubs_updated_at on public.culture_clubs rename to trg_culture_clubs_updated_at;

alter policy clubs_public_read  on public.culture_clubs rename to culture_clubs_public_read;
alter policy clubs_staff_read   on public.culture_clubs rename to culture_clubs_staff_read;
alter policy clubs_staff_insert on public.culture_clubs rename to culture_clubs_staff_insert;
alter policy clubs_staff_update on public.culture_clubs rename to culture_clubs_staff_update;
alter policy clubs_admin_all    on public.culture_clubs rename to culture_clubs_admin_all;

-- Временное представление на время выкатки: код на проде обращается к "clubs".
-- security_invoker = true — представление выполняется с правами вызывающего,
-- поэтому RLS исходной таблицы продолжает действовать в полном объёме.
create view public.clubs
  with (security_invoker = true)
  as select * from public.culture_clubs;

-- Новый объект наследует полные права для anon и authenticated из-за
-- alter default privileges Supabase. revoke ... from public этого не снимает.
revoke all on public.clubs from anon;
revoke all on public.clubs from authenticated;

grant select on public.clubs to anon;
grant select, insert, update, delete on public.clubs to authenticated;

comment on view public.clubs is
  'Временная совместимость на время выкатки переименования. Удаляется миграцией drop_clubs_compat_view.';
