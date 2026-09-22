-- =====================================================================
-- applications: две недостающие колонки под текущую форму записи
--
-- Проект Supabase: culture-portal-kz (ref: lmawtmoqaetlvidffwnp)
--
-- ЗАЧЕМ. Форма в src/app/actions/applications.ts собирает шесть полей:
--   childName, age, parentPhone, clubTitle, comment, consent.
-- В схеме им соответствуют applicant_name, applicant_phone, message,
-- consent_given — а для age и clubTitle места нет:
--   * возраст ребёнка вообще некуда положить;
--   * club_id это uuid, но кружки ещё не заведены в базу, а форма
--     присылает название строкой.
-- Без этих колонок перенос заявок с диска Railway был бы с потерями.
--
-- ХАРАКТЕР ОПЕРАЦИИ. Это ALTER TABLE ADD COLUMN на существующей таблице.
-- Ни одна колонка не удаляется и не меняет тип, данные не затрагиваются.
-- ADD COLUMN IF NOT EXISTS делает скрипт идемпотентным.
-- Обе колонки nullable, поэтому существующие строки (сейчас их 0)
-- не нарушат ограничений.
--
-- RLS не меняется: политика applications_public_insert не ссылается на
-- эти поля, они заполняются так же, как applicant_name — данными,
-- которые ввёл посетитель.
-- =====================================================================

begin;

alter table public.applications add column if not exists applicant_age text;
alter table public.applications add column if not exists club_title    text;

comment on column public.applications.applicant_age is
  'Возраст ребёнка так, как его ввёл родитель. Текст, а не число: в форме это свободное поле, встречается «7 лет», «6-7».';
comment on column public.applications.club_title is
  'Название кружка на момент подачи заявки. Снимок, а не ссылка: club_id может быть NULL (кружка ещё нет в базе) или указывать на переименованный кружок, а заявку нужно уметь прочитать так, как её подавали.';

commit;

-- ---------------------------------------------------------------------
-- Проверка (выполнять отдельно, ничего не меняет)
-- ---------------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name='applications'
-- order by ordinal_position;
