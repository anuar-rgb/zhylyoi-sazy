-- =====================================================================
-- Storage: бакет club-images для фотографий кружков
--
-- Проект Supabase: culture-portal-kz (ref: lmawtmoqaetlvidffwnp)
--
-- СХЕМА ПУТЕЙ
--   club-images/<organization_id>/<club_id>/<файл>
--   Первый сегмент — организация. По нему политики проверяют права,
--   поэтому загрузить файл в чужую папку нельзя даже с валидной сессией.
--
-- ПУБЛИЧНОЕ ЧТЕНИЕ. При public = true Supabase отдаёт файлы по адресу
-- /storage/v1/object/public/club-images/<path> В ОБХОД RLS. Политика чтения
-- ниже нужна для API-вызовов из админки (list, download); на прямую ссылку
-- она не влияет. Для фотографий кружков это ожидаемо: у кого есть URL —
-- тот скачает. Закрытые файлы должны жить в другом бакете.
--
-- ПРАВА НА ЗАПИСЬ — is_staff_of, то есть любой сотрудник организации.
-- Совпадает с правами на саму запись: политика clubs_staff_update разрешает
-- редактировать кружок любому сотруднику, значит и фото менять может он же.
--
-- Политики других таблиц не затрагиваются. Всё ниже действует только на
-- storage.objects и только при bucket_id = 'club-images'.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Бакет
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-images',
  'club-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Безопасное приведение к uuid
-- ---------------------------------------------------------------------
-- Первый сегмент пути берётся из имени файла, то есть приходит от клиента.
-- Прямой каст '<мусор>'::uuid не вернёт false, а бросит исключение, и
-- политика упадёт с ошибкой вместо отказа в доступе. Обёртка превращает
-- невалидное значение в NULL, которое проверка прав корректно отсекает.
create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $fn$
begin
  return value::uuid;
exception when others then
  return null;
end
$fn$;

-- Поимённо: ALTER DEFAULT PRIVILEGES в Supabase раздаёт EXECUTE всем ролям
-- на каждую новую функцию, и REVOKE FROM public этого не снимает.
revoke all on function public.try_uuid(text) from public;
revoke all on function public.try_uuid(text) from anon;
grant execute on function public.try_uuid(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Политики storage.objects
-- ---------------------------------------------------------------------

drop policy if exists club_images_public_read on storage.objects;
create policy club_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'club-images');

drop policy if exists club_images_staff_insert on storage.objects;
create policy club_images_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'club-images'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists club_images_staff_update on storage.objects;
create policy club_images_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'club-images'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'club-images'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists club_images_staff_delete on storage.objects;
create policy club_images_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'club-images'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

commit;
