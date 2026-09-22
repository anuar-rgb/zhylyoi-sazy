-- =====================================================================
-- organizations: название и адрес на двух языках
--
-- Название и адрес учреждения разные на двух языках: «Кең Жылыой» Жылыой
-- аудандық мәдениет үйі против Дом культуры «Кен Жылыой» Жылыойского
-- района. С одной колонкой одна из языковых версий сайта показывала бы
-- чужой язык.
--
-- Старые колонки name и address остаются нетронутыми: name — NOT NULL и
-- служит запасным значением, удаление колонки разрушающее.
--
-- Значения для заполнения взяты из кода сайта (подвал и страница
-- контактов), то есть они и так публичные. coalesce гарантирует, что уже
-- заполненное не затрётся: при повторном прогоне миграция ничего не меняет.
-- =====================================================================

begin;

alter table public.organizations
  add column if not exists name_kk    text,
  add column if not exists name_ru    text,
  add column if not exists address_kk text,
  add column if not exists address_ru text;

update public.organizations set
  name_kk    = coalesce(name_kk,    '«Кең Жылыой» Жылыой аудандық мәдениет үйі'),
  name_ru    = coalesce(name_ru,    'Дом культуры «Кен Жылыой» Жылыойского района'),
  address_kk = coalesce(address_kk, 'Атырау облысы, Жылыой ауданы, Құлсары қаласы, Махамбет даңғылы, 37'),
  address_ru = coalesce(address_ru, 'Атырауская область, Жылыойский район, г. Кульсары, проспект Махамбет, 37'),
  phone      = coalesce(phone,      '+7 778 927 63 87'),
  email      = coalesce(email,      'dk.kenzhylyoi@gmail.com')
where slug = 'ken-zhylyoi';

commit;
