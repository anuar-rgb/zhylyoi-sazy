-- =====================================================================
-- profiles.region_id — областной администратор без учреждения
--
-- is_same_region_as_current определяла «свою область» так: брала учреждение,
-- к которому человек приписан, и смотрела его область. Нет приписки — не с
-- чем сравнивать, и regional_admin не мог ничего: измерено, права были
-- нулевые.
--
-- Это абсурд: чтобы управлять всеми учреждениями области, начальник
-- областного управления культуры должен был формально числиться в одном
-- конкретном Доме культуры.
--
-- Теперь область хранится прямо в профиле. Запасной путь через учреждение
-- сохранён, поэтому настроенный по-старому regional_admin продолжает
-- работать. Проверено на откате:
--
--   область в профиле, учреждения нет  -> управляет: да (было нет)
--   учреждение есть, области нет       -> управляет: да (как раньше)
--   ни области, ни учреждения          -> управляет: нет
--
-- can_manage_org не меняется: она вызывает is_same_region_as_current и
-- начинает работать правильно сама.
-- =====================================================================

begin;

alter table public.profiles
  add column if not exists region_id uuid references public.regions(id) on delete set null;

comment on column public.profiles.region_id is
  'Область сотрудника. Нужна regional_admin, который не работает в конкретном учреждении. Пусто у остальных ролей: у них область выводится из учреждения.';

-- Область человека: сначала поле профиля, затем область его учреждения.
create or replace function public.current_region_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(
    p.region_id,
    (select o.region_id from public.organizations o where o.id = p.organization_id)
  )
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active = true
$fn$;

-- Поимённо: alter default privileges в Supabase раздаёт EXECUTE всем ролям на
-- каждую новую функцию, и revoke from public этого не снимает.
revoke all on function public.current_region_id() from public;
revoke all on function public.current_region_id() from anon;
grant execute on function public.current_region_id() to authenticated;

-- Сравниваем область целевого учреждения с областью человека, а не выводим её
-- через его учреждение.
create or replace function public.is_same_region_as_current(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.organizations o
    where o.id = org
      and o.region_id is not null
      and o.region_id = public.current_region_id()
  )
$fn$;

commit;
