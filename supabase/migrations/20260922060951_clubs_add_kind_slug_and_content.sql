-- =====================================================================
-- public.clubs: разделение на кружки и творческие коллективы
--               плюс поля, без которых перенос из src/data/clubs.ts
--               был бы с потерями
--
-- Проект Supabase: culture-portal-kz (ref: lmawtmoqaetlvidffwnp)
--
-- ЗАЧЕМ.
--   kind          — «Кружки» и «Творческие коллективы» живут в одной таблице,
--                   но это разные разделы сайта. Значение по умолчанию 'club'
--                   делает существующие записи кружками без единого UPDATE.
--   slug          — /clubs/[slug] маршрутизируется по нему; без slug страницы
--                   кружков после переноса перестанут открываться.
--   direction_*   — ClubItem.direction. Поле локализовано («Театр өнері» против
--                   «Театральное искусство»), поэтому две колонки, а не одна:
--                   одна потеряла бы половину контента при переносе.
--   full_text_*   — ClubItem.fullText, массив абзацев полного описания.
--   images        — ClubItem.images.
--
-- ХАРАКТЕР ОПЕРАЦИИ. Только ALTER TABLE ADD COLUMN и CREATE INDEX.
-- Ни одна колонка не удаляется, не переименовывается и не меняет тип.
-- Данные существующих кружков не затрагиваются. RLS не меняется:
-- политики на clubs не ссылаются на эти поля.
--
-- ИДЕМПОТЕНТНОСТЬ. ADD COLUMN IF NOT EXISTS и CREATE INDEX IF NOT EXISTS —
-- повторный запуск ничего не сломает и ничего не перезапишет.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Тип записи
-- ---------------------------------------------------------------------
-- NOT NULL безопасен только вместе с DEFAULT: существующие строки
-- получают 'club' автоматически, без отдельного UPDATE.
alter table public.clubs
  add column if not exists kind text not null default 'club';

comment on column public.clubs.kind is
  'club — обычный кружок, показывается в разделе «Кружки». creative_collective — творческий коллектив, показывается в разделе «Творческие коллективы». CHECK намеренно не ставится, чтобы новый вид не требовал миграции.';

-- ---------------------------------------------------------------------
-- 2. Адрес страницы
-- ---------------------------------------------------------------------
-- Nullable: старые записи переносятся постепенно, и до переноса slug у них
-- нет. Уникальность обеспечивается частичным индексом ниже, поэтому
-- несколько NULL друг другу не мешают.
alter table public.clubs
  add column if not exists slug text;

comment on column public.clubs.slug is
  'Адрес страницы: /clubs/<slug>. Nullable до завершения переноса. Уникален в пределах организации — см. uq_clubs_org_slug.';

-- ---------------------------------------------------------------------
-- 3. Контентные поля
-- ---------------------------------------------------------------------
alter table public.clubs
  add column if not exists direction_kk text;

alter table public.clubs
  add column if not exists direction_ru text;

alter table public.clubs
  add column if not exists full_text_kk text;

alter table public.clubs
  add column if not exists full_text_ru text;

-- jsonb, а не text[]: элемент это объект {url, path}. path нужен, чтобы при
-- замене фото или удалении кружка убрать файл из бакета — по публичному URL
-- это делать неудобно. jsonb переживёт добавление подписей и порядка без
-- миграции типа.
alter table public.clubs
  add column if not exists images jsonb not null default '[]'::jsonb;

comment on column public.clubs.direction_kk is
  'Направление на казахском: «Театр өнері», «Хореография».';
comment on column public.clubs.direction_ru is
  'Направление на русском: «Театральное искусство», «Хореография».';
comment on column public.clubs.full_text_kk is
  'Полное описание на казахском. В исходных данных это массив абзацев — при переносе склеивается через двойной перенос строки.';
comment on column public.clubs.full_text_ru is
  'Полное описание на русском.';
comment on column public.clubs.images is
  'Массив объектов [{"url": "...", "path": "..."}]. url для отображения, path для удаления файла из Storage. Пустой массив, а не NULL, чтобы читающий код не проверял на NULL перед обходом.';

-- ---------------------------------------------------------------------
-- 4. Уникальность адреса в пределах организации
-- ---------------------------------------------------------------------
-- Частичный: WHERE slug is not null. Без него несколько непере­несённых
-- записей с NULL конфликтовали бы между собой в обычном UNIQUE.
-- Уникальность именно по (organization_id, slug), а не по slug: у разных
-- учреждений платформы может быть свой кружок с тем же адресом.
create unique index if not exists uq_clubs_org_slug
  on public.clubs (organization_id, slug)
  where slug is not null;

-- Раздел сайта выбирается по kind, поэтому выборка идёт по нему вместе
-- с организацией и признаком активности.
create index if not exists idx_clubs_org_kind
  on public.clubs (organization_id, kind, is_active);

commit;

-- ---------------------------------------------------------------------
-- Проверка результата (выполнять отдельно, ничего не меняет)
-- ---------------------------------------------------------------------
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='clubs'
-- order by ordinal_position;
--
-- select indexname, indexdef from pg_indexes
-- where schemaname='public' and tablename='clubs';
