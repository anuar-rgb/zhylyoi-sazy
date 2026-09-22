-- =====================================================================
-- news -> culture_news
--
-- То же, что и для culture_events: переименование сохраняет политики,
-- индексы, ограничения, триггер и гранты. Таблица пуста, из кода к ней
-- обращается только счётчик на дашборде, поэтому временное представление
-- не нужно.
-- =====================================================================

begin;

alter table public.news rename to culture_news;

alter table public.culture_news rename constraint news_pkey                to culture_news_pkey;
alter table public.culture_news rename constraint news_organization_id_fkey to culture_news_organization_id_fkey;
alter table public.culture_news rename constraint news_created_by_fkey      to culture_news_created_by_fkey;
alter table public.culture_news rename constraint news_status_check         to culture_news_status_check;
alter table public.culture_news rename constraint news_content_present      to culture_news_content_present;

alter index public.idx_news_organization_id rename to idx_culture_news_organization_id;
alter index public.idx_news_status          rename to idx_culture_news_status;
alter index public.idx_news_published_at    rename to idx_culture_news_published_at;
alter index public.idx_news_org_status_pub  rename to idx_culture_news_org_status_pub;
alter index public.uq_news_org_slug         rename to uq_culture_news_org_slug;

alter trigger trg_news_updated_at on public.culture_news rename to trg_culture_news_updated_at;

alter policy news_public_read         on public.culture_news rename to culture_news_public_read;
alter policy news_staff_read          on public.culture_news rename to culture_news_staff_read;
alter policy news_staff_insert        on public.culture_news rename to culture_news_staff_insert;
alter policy news_staff_update_drafts on public.culture_news rename to culture_news_staff_update_drafts;
alter policy news_admin_all           on public.culture_news rename to culture_news_admin_all;

commit;
