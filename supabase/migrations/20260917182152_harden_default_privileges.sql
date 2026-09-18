-- =====================================================================
-- Исправление привилегий по умолчанию
--
-- Причина: Supabase настраивает
--   alter default privileges in schema public
--     grant all on tables/functions to postgres, anon, authenticated, service_role;
-- Поэтому каждый новый объект в схеме public создаётся с ПОЛНЫМИ правами
-- для anon и authenticated (для таблиц это arwdDxtm, включая TRUNCATE,
-- который RLS не ограничивает).
--
-- `REVOKE ... FROM public` этого не снимает: права выданы явно конкретным
-- ролям, а не псевдороли PUBLIC. Отзывать нужно поимённо.
--
-- Скрипт меняет ТОЛЬКО ACL. Ни таблицы, ни колонки, ни строки не
-- затрагиваются. Идемпотентен.
-- =====================================================================

begin;

-- --------------------------- anon -----------------------------------
revoke all on public.regions       from anon;
revoke all on public.organizations from anon;
revoke all on public.profiles      from anon;
revoke all on public.events        from anon;
revoke all on public.news          from anon;
revoke all on public.clubs         from anon;
revoke all on public.applications  from anon;

grant select on public.regions       to anon;
grant select on public.organizations to anon;
grant select on public.events        to anon;
grant select on public.news          to anon;
grant select on public.clubs         to anon;
grant insert on public.applications  to anon;
-- profiles: anon не получает ничего

-- ----------------------- authenticated ------------------------------
revoke all on public.regions       from authenticated;
revoke all on public.organizations from authenticated;
revoke all on public.profiles      from authenticated;
revoke all on public.events        from authenticated;
revoke all on public.news          from authenticated;
revoke all on public.clubs         from authenticated;
revoke all on public.applications  from authenticated;

grant select, insert, update, delete on public.regions       to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.events        to authenticated;
grant select, insert, update, delete on public.news          to authenticated;
grant select, insert, update, delete on public.clubs         to authenticated;
grant select, insert, update, delete on public.applications  to authenticated;
-- profiles: только чтение и правка, без INSERT/DELETE
grant select, update on public.profiles to authenticated;

-- --------------------------- функции --------------------------------
-- Функции доступа вызываются только из политик для authenticated.
revoke all on function public.current_role_name()             from anon;
revoke all on function public.current_org_id()                from anon;
revoke all on function public.is_platform_admin()             from anon;
revoke all on function public.is_same_region_as_current(uuid) from anon;
revoke all on function public.can_manage_org(uuid)            from anon;
revoke all on function public.is_staff_of(uuid)               from anon;

grant execute on function public.current_role_name()             to authenticated;
grant execute on function public.current_org_id()                to authenticated;
grant execute on function public.is_platform_admin()             to authenticated;
grant execute on function public.is_same_region_as_current(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid)            to authenticated;
grant execute on function public.is_staff_of(uuid)               to authenticated;

-- Триггерные функции не вызываются напрямую никем.
-- Права на EXECUTE при срабатывании триггера Postgres не проверяет.
revoke all on function public.set_updated_at()                    from anon, authenticated;
revoke all on function public.profiles_guard_privileged_columns() from anon, authenticated;

commit;
