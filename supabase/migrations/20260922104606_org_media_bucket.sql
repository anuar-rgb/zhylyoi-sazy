-- =====================================================================
-- Storage: единый бакет org-media вместо club-images
--
-- Фотографии появляются не только у кружков, но и у мероприятий и
-- новостей, поэтому имя club-images перестало быть верным. Имя бакета
-- попадает в публичные адреса картинок навсегда, а файлов в нём сейчас
-- ноль — это последний момент, когда замена бесплатна.
--
-- СХЕМА ПУТЕЙ
--   org-media/<organization_id>/culture-clubs/<файл>
--   org-media/<organization_id>/culture-events/<файл>
--   org-media/<organization_id>/culture-news/<файл>
--
-- Первый сегмент — организация, по нему политики проверяют права, как и
-- раньше. Второй сегмент — раздел, он нужен людям, а не политикам.
--
-- ПУБЛИЧНОЕ ЧТЕНИЕ. При public = true Supabase отдаёт файлы по адресу
-- /storage/v1/object/public/org-media/<path> В ОБХОД RLS. Политика чтения
-- ниже нужна для API-вызовов из админки; на прямую ссылку она не влияет.
-- Закрытые файлы должны жить в другом бакете.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Новый бакет
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-media',
  'org-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Политики нового бакета
-- ---------------------------------------------------------------------
-- public.try_uuid уже создана миграцией club_images_bucket: прямой каст
-- '<мусор>'::uuid бросил бы исключение вместо отказа в доступе.

drop policy if exists org_media_public_read on storage.objects;
create policy org_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-media');

drop policy if exists org_media_staff_insert on storage.objects;
create policy org_media_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-media'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists org_media_staff_update on storage.objects;
create policy org_media_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-media'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'org-media'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists org_media_staff_delete on storage.objects;
create policy org_media_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-media'
    and public.is_staff_of(public.try_uuid((storage.foldername(name))[1]))
  );

-- ---------------------------------------------------------------------
-- 3. Снятие старого бакета
-- ---------------------------------------------------------------------
-- Саму запись бакета отсюда удалить нельзя: в Supabase на storage.buckets
-- висит триггер storage.protect_delete(), который отклоняет прямое удаление
-- из SQL и требует Storage API. Поэтому миграция снимает с club-images все
-- политики — писать в него после этого не сможет никто, — а пустую запись
-- бакета нужно удалить вручную в панели Supabase: Storage -> club-images.
--
-- Предохранитель: если между подготовкой и применением кто-то успел
-- загрузить фотографию, миграция отказывается работать, а не оставляет
-- файлы без политик. Тогда сначала переносим содержимое, потом повторяем.
do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'club-images') then
    raise exception 'В бакете club-images есть файлы — снятие политик отменено. Перенесите их в org-media и повторите.';
  end if;
end
$$;

drop policy if exists club_images_public_read  on storage.objects;
drop policy if exists club_images_staff_insert on storage.objects;
drop policy if exists club_images_staff_update on storage.objects;
drop policy if exists club_images_staff_delete on storage.objects;

commit;
