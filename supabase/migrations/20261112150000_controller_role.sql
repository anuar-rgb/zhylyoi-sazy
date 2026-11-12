-- Роль «Контролёр»: сотрудник на входе в зал. Он только проверяет билеты и видит схему зала,
-- больше ничего: ни заказов, ни денег, ни почты покупателей, ни правки сайта.
--
-- 1. profiles.role допускает 'controller'.
-- 2. is_staff_of больше не считает контролёра сотрудником: все политики и функции, которые
--    открывают правку и чтение служебных данных через is_staff_of, ему закрыты.
-- 3. is_door_staff_of: сотрудник учреждения или его активный контролёр. По ней check_in_ticket
--    решает, кому можно отмечать билеты.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('platform_admin', 'regional_admin', 'organization_admin', 'controller'));

create or replace function public.is_staff_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.can_manage_org(org)
      or (org is not null
          and public.current_org_id() = org
          and public.current_role_name() is distinct from 'controller')
$fn$;

create or replace function public.is_door_staff_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.is_staff_of(org)
      or (org is not null and public.current_org_id() = org and public.current_role_name() = 'controller')
$fn$;

revoke all on function public.is_door_staff_of(uuid) from public, anon;
grant execute on function public.is_door_staff_of(uuid) to authenticated;

-- check_in_ticket: the same function, the institution check now lets its controller in too.
do $do$
declare
  v_def text;
begin
  select pg_get_functiondef('public.check_in_ticket(uuid, uuid)'::regprocedure) into v_def;
  if position('public.is_staff_of(v_book.organization_id) is not true' in v_def) = 0 then
    raise exception 'check_in_ticket: the institution check was not found, nothing changed';
  end if;
  v_def := replace(v_def, 'public.is_staff_of(v_book.organization_id) is not true', 'public.is_door_staff_of(v_book.organization_id) is not true');
  execute v_def;
end;
$do$;
