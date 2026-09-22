-- =====================================================================
-- Сокращение ролей до трёх
--
-- Решение владельца: у каждого учреждения один администратор, который
-- делает всё — создаёт, публикует, правит, архивирует, удаляет. У
-- областного портала тоже один администратор, собирающий материалы
-- учреждений своей области. Отдельные роли для «подготовил, но не
-- публикует» не нужны.
--
-- Убираются: editor, manager.
-- Остаются: platform_admin, regional_admin, organization_admin.
--
-- ВАЖНО: default колонки сейчас 'editor'. Его нужно сменить ДО замены
-- ограничения, иначе таблица останется со значением по умолчанию,
-- которое сама же запрещает, и первая вставка без явной роли упадёт.
--
-- Данные не затрагиваются: ни одной строки не вставляется, не меняется
-- и не удаляется.
-- =====================================================================

begin;

-- Предохранитель: если кто-то успел завести редактора, миграция
-- отказывается работать, а не оставляет строку, нарушающую ограничение.
do $$
declare
  n int;
begin
  select count(*) into n from public.profiles
   where role not in ('platform_admin', 'regional_admin', 'organization_admin');
  if n > 0 then
    raise exception 'Профилей с удаляемыми ролями: %. Сначала переведите их в organization_admin.', n;
  end if;
end
$$;

alter table public.profiles alter column role set default 'organization_admin';

alter table public.profiles drop constraint profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role in ('platform_admin', 'regional_admin', 'organization_admin'));

comment on column public.profiles.role is
  'platform_admin | regional_admin | organization_admin. Один администратор на учреждение и один на областной портал; промежуточных ролей нет. Новая роль добавляется правкой CHECK-ограничения отдельной миграцией.';

commit;
