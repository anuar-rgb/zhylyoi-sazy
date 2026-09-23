-- =====================================================================
-- culture_videos — перенос двух записей из кода страницы /video
--
-- Обе остаются kind = 'file': ссылок на YouTube у них нет, а выбрасывать их
-- значило бы оставить страницу пустой до тех пор, пока учреждение не выложит
-- записи на YouTube.
--
-- Файлы лежат в самом приложении, не в хранилище, поэтому удаление записи
-- ничего из бакета стирать не будет — и не должно.
--
-- ИДЕМПОТЕНТНОСТЬ. Вставка целиком пропускается, если в учреждении уже есть
-- хоть одна запись.
-- =====================================================================

begin;

with org as (
  select id from public.organizations where slug = 'ken-zhylyoi'
), incoming (title, title_kk, title_ru, description_kk, description_ru,
             venue_kk, venue_ru, kind, file_path, sort_order) as (
  values
  ('Фольклорный ансамбль «Жылыой сазы»',
   '«Жылыой сазы» фольклорлық ансамблі',
   'Фольклорный ансамбль «Жылыой сазы»',
   'Ансамбльдің «Кең Жылыой» мәдениет үйіндегі концерттік бейнежазбасы',
   'Концертная видеозапись ансамбля в доме культуры «Кен Жылыой»',
   '«Кең Жылыой» мәдениет үйі, 2026 жыл',
   'Дом культуры «Кен Жылыой», 2026 год',
   'file', '/videos/ensemble-2026.mp4', 10),
  ('Концертная видеозапись',
   'Концерттік бейнежазба',
   'Концертная видеозапись',
   'Ансамбльдің сахнадағы өнер көрсетуі',
   'Выступление ансамбля на сцене',
   '«Кең Жылыой» мәдениет үйі, 2026 жыл',
   'Дом культуры «Кен Жылыой», 2026 год',
   'file', '/videos/concert-2026.mp4', 20)
)
insert into public.culture_videos (
  organization_id, title, title_kk, title_ru, description_kk, description_ru,
  venue_kk, venue_ru, kind, file_path, sort_order, is_active
)
select org.id, i.title, i.title_kk, i.title_ru, i.description_kk, i.description_ru,
       i.venue_kk, i.venue_ru, i.kind, i.file_path, i.sort_order, true
from incoming i cross join org
where not exists (
  select 1 from public.culture_videos v where v.organization_id = org.id
);

commit;
