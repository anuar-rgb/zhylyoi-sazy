-- =====================================================================
-- events -> culture_events
--
-- Правило именования платформы: таблицы контента называются
-- {домен}_{сущность}, никогда просто {сущность}.
--
-- ALTER TABLE ... RENAME меняет только имя отношения: политики, индексы,
-- ограничения, триггер и гранты привязаны к OID и переживают его. FK из
-- applications.event_id перенацелится сам. Ниже приводятся в порядок
-- только ИМЕНА зависимых объектов.
--
-- Временное представление здесь НЕ нужно, в отличие от переименования
-- clubs: таблица пуста, а из кода к ней обращается только счётчик на
-- дашборде админки. На публичных страницах это не видно — афиша сейчас
-- читается из src/data/events.ts.
-- =====================================================================

begin;

alter table public.events rename to culture_events;

alter table public.culture_events rename constraint events_pkey               to culture_events_pkey;
alter table public.culture_events rename constraint events_organization_id_fkey to culture_events_organization_id_fkey;
alter table public.culture_events rename constraint events_created_by_fkey     to culture_events_created_by_fkey;
alter table public.culture_events rename constraint events_status_check        to culture_events_status_check;

alter index public.idx_events_organization_id  rename to idx_culture_events_organization_id;
alter index public.idx_events_status           rename to idx_culture_events_status;
alter index public.idx_events_event_date       rename to idx_culture_events_event_date;
alter index public.idx_events_org_status_date  rename to idx_culture_events_org_status_date;
alter index public.uq_events_org_slug          rename to uq_culture_events_org_slug;

alter trigger trg_events_updated_at on public.culture_events rename to trg_culture_events_updated_at;

alter policy events_public_read         on public.culture_events rename to culture_events_public_read;
alter policy events_staff_read          on public.culture_events rename to culture_events_staff_read;
alter policy events_staff_insert        on public.culture_events rename to culture_events_staff_insert;
alter policy events_staff_update_drafts on public.culture_events rename to culture_events_staff_update_drafts;
alter policy events_admin_all           on public.culture_events rename to culture_events_admin_all;

commit;
