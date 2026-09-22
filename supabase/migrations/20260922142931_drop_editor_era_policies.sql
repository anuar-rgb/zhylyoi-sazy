-- =====================================================================
-- Уборка политик, написанных под роль редактора
--
-- У таблиц контента было по пять политик, три из них существовали ради
-- редактора: «читать своё учреждение», «вставлять в своё», «править только
-- черновики». Роли editor и manager убраны миграцией profiles_reduce_roles,
-- остались platform_admin, regional_admin и organization_admin.
--
-- Формально: is_staff_of(org) = can_manage_org(org) OR «приписан к org».
-- Вторая половина давала права тем, кто приписан, но не управляет — то есть
-- ровно редактору и менеджеру. Все три оставшиеся роли проходят по первой
-- половине, значит вторая никому ничего не добавляет.
--
-- Проверено на откате: после удаления администратор по-прежнему видит все
-- записи и создаёт, правит и удаляет их; посетитель видит опубликованное и
-- получает 42501 на запись. После применения прогнаны проверки прода:
-- кружки 100/100, новости 39/39, тексты 30/30, контакты 23/23.
--
-- ВНИМАНИЕ: applications здесь НЕ трогается. У неё applications_staff_read —
-- единственная политика чтения, политики FOR ALL нет, и её удаление отобрало
-- бы доступ к заявкам целиком.
--
-- Откат: восстановить политики обратной миграцией; их выражения сохранены в
-- initial_platform_schema.sql.
-- =====================================================================

begin;

drop policy if exists culture_clubs_staff_read   on public.culture_clubs;
drop policy if exists culture_clubs_staff_insert on public.culture_clubs;
drop policy if exists culture_clubs_staff_update on public.culture_clubs;

drop policy if exists culture_events_staff_read          on public.culture_events;
drop policy if exists culture_events_staff_insert        on public.culture_events;
drop policy if exists culture_events_staff_update_drafts on public.culture_events;

drop policy if exists culture_news_staff_read          on public.culture_news;
drop policy if exists culture_news_staff_insert        on public.culture_news;
drop policy if exists culture_news_staff_update_drafts on public.culture_news;

-- org_sections: admin_all покрывает чтение, staff_read избыточна.
drop policy if exists org_sections_staff_read on public.org_sections;

commit;
