-- =====================================================================
-- Региональная цифровая платформа учреждений культуры Атырауской области
-- Этап 1: базовая схема + двуязычие (kk/ru) + регионы + RLS
--
-- Проект Supabase: culture-portal-kz (ref: lmawtmoqaetlvidffwnp)
-- Версия 2 (учтены уточнения: мультиязычность, regions.region_id)
--
-- Свойства скрипта:
--   * идемпотентен — повторный запуск не ломает базу;
--   * НЕ выполняет DROP / TRUNCATE / ALTER существующих таблиц;
--   * если таблица уже существует, её структура НЕ меняется (выводится NOTICE);
--   * DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS применяются ТОЛЬКО
--     к объектам с именами, определёнными в этом же файле, на семи
--     новых таблицах — это нужно для повторного запуска;
--   * пользователи Auth, пароли, email и тестовые данные НЕ создаются.
--
-- Сознательно НЕ входит в эту миграцию (отдельные этапы):
--   audit_log, invitations, галерея изображений, Storage buckets,
--   profile_organizations, districts, отчёты, платежи.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Предполётная проверка
-- ---------------------------------------------------------------------
do $guard$
declare
  t text;
begin
  foreach t in array array['regions','organizations','profiles','events','news','clubs','applications']
  loop
    if to_regclass('public.' || t) is not null then
      raise notice 'ВНИМАНИЕ: public.% уже существует — структура НЕ изменяется этим скриптом.', t;
    end if;
  end loop;
end
$guard$;


-- ---------------------------------------------------------------------
-- 1. Таблицы
-- ---------------------------------------------------------------------

-- 1.0 regions — минимальный справочник регионов
create table if not exists public.regions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.regions is
  'Минимальный справочник регионов. Районы (districts) — следующий этап.';
comment on column public.regions.code is
  'Короткий код региона, например ATY. Nullable, но уникален.';

-- 1.1 organizations — учреждения культуры
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  type        text not null default 'culture_house',
  region_id   uuid references public.regions(id) on delete restrict,
  description text,
  address     text,
  phone       text,
  email       text,
  logo_url    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Учреждения культуры. Корень мультиарендности: всё остальное ссылается на organization_id.';
comment on column public.organizations.type is
  'Ожидаемые значения: culture_house | library | museum | theater | concert_hall | cultural_department | other. CHECK намеренно НЕ ставится, чтобы новые типы добавлялись без миграции.';
comment on column public.organizations.region_id is
  'Nullable на этапе 1. Пока NULL, роль regional_admin не получает доступа за пределы своей организации.';

-- 1.2 profiles — профили сотрудников, 1:1 с auth.users
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  role            text not null default 'editor'
                    check (role in ('platform_admin','regional_admin','organization_admin','editor','manager')),
  organization_id uuid references public.organizations(id) on delete set null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Профиль сотрудника. Создаётся ТОЛЬКО контролируемо (SQL editor / service_role). Автоматической регистрации и автоназначения ролей нет.';
comment on column public.profiles.role is
  'platform_admin | regional_admin | organization_admin | editor | manager. Новая роль добавляется правкой CHECK-ограничения отдельной миграцией.';

-- 1.3 events — мероприятия (афиша)
-- title / description / location — универсальные (служебные, резервные),
-- *_kk / *_ru — отображаемые переводы. Порядок разрешения в приложении —
-- сначала нужный язык, затем второй язык, затем универсальное поле:
--   для kk: coalesce(title_kk, title_ru, title)
--   для ru: coalesce(title_ru, title_kk, title)
-- Тот же порядок применяется к description/location в events,
-- excerpt/content в news и name/description/schedule в clubs.
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  title_kk        text,
  title_ru        text,
  slug            text,
  description     text,
  description_kk  text,
  description_ru  text,
  event_date      timestamptz not null,
  end_date        timestamptz,
  location        text,
  location_kk     text,
  location_ru     text,
  cover_image_url text,
  age_limit       text,
  category        text,
  organizer       text,
  status          text not null default 'draft'
                    check (status in ('draft','pending','published','archived')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.events.title is
  'Служебное название: списки админки, поиск, генерация slug, уведомления. Резерв, если перевод не заполнен.';
comment on column public.events.category is
  'Рубрика мероприятия простым текстом: concert | performance | exhibition | competition | children. Отдельный справочник категорий — следующий этап.';
comment on column public.events.organizer is
  'Организатор мероприятия (ансамбль, коллектив). Перенос поля organizer из src/data/events.ts.';

-- 1.4 news — новости
create table if not exists public.news (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  title_kk        text,
  title_ru        text,
  slug            text,
  tag             text,
  excerpt         text,
  excerpt_kk      text,
  excerpt_ru      text,
  content         text,
  content_kk      text,
  content_ru      text,
  cover_image_url text,
  status          text not null default 'draft'
                    check (status in ('draft','pending','published','archived')),
  published_at    timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint news_content_present
    check (num_nonnulls(content, content_kk, content_ru) >= 1)
);

comment on column public.news.tag is
  'Рубрика новости простым текстом. Перенос поля tag из src/data/news.ts. Отдельный справочник рубрик — следующий этап.';
comment on constraint news_content_present on public.news is
  'Текст новости обязателен, но достаточно любого одного варианта: универсального или перевода. Заменяет NOT NULL на content, чтобы редактор не дублировал текст трижды.';

-- 1.5 clubs — кружки и творческие коллективы
create table if not exists public.clubs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  name_kk         text,
  name_ru         text,
  description     text,
  description_kk  text,
  description_ru  text,
  age_range       text,
  schedule        text,
  schedule_kk     text,
  schedule_ru     text,
  manager_name    text,
  contact_phone   text,
  capacity        integer,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.clubs.name is
  'Служебное название кружка: списки админки, привязка заявок, поиск. Резерв, если перевод не заполнен.';

-- 1.6 applications — заявки посетителей
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  club_id         uuid references public.clubs(id) on delete set null,
  event_id        uuid references public.events(id) on delete set null,
  applicant_name  text not null,
  applicant_phone text not null,
  applicant_email text,
  message         text,
  consent_given   boolean not null default false,
  status          text not null default 'new'
                    check (status in ('new','in_progress','completed','rejected')),
  processed_by    uuid references auth.users(id) on delete set null,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.applications is
  'Персональные данные заявителей. Публичного чтения нет ни при каких условиях.';


-- ---------------------------------------------------------------------
-- 2. Индексы
-- ---------------------------------------------------------------------
create index if not exists idx_regions_is_active on public.regions (is_active);

create index if not exists idx_organizations_is_active on public.organizations (is_active);
create index if not exists idx_organizations_type      on public.organizations (type);
create index if not exists idx_organizations_region_id on public.organizations (region_id);

create index if not exists idx_profiles_organization_id on public.profiles (organization_id);
create index if not exists idx_profiles_role            on public.profiles (role);

create index if not exists idx_events_organization_id on public.events (organization_id);
create index if not exists idx_events_event_date      on public.events (event_date desc);
create index if not exists idx_events_status          on public.events (status);
create index if not exists idx_events_org_status_date on public.events (organization_id, status, event_date desc);
create unique index if not exists uq_events_org_slug
  on public.events (organization_id, slug) where slug is not null;

create index if not exists idx_news_organization_id on public.news (organization_id);
create index if not exists idx_news_status         on public.news (status);
create index if not exists idx_news_published_at   on public.news (published_at desc);
create index if not exists idx_news_org_status_pub on public.news (organization_id, status, published_at desc);
create unique index if not exists uq_news_org_slug
  on public.news (organization_id, slug) where slug is not null;

create index if not exists idx_clubs_organization_id on public.clubs (organization_id);
create index if not exists idx_clubs_is_active       on public.clubs (is_active);

create index if not exists idx_applications_organization_id on public.applications (organization_id);
create index if not exists idx_applications_status          on public.applications (status);
create index if not exists idx_applications_created_at      on public.applications (created_at desc);
create index if not exists idx_applications_club_id         on public.applications (club_id);
create index if not exists idx_applications_event_id        on public.applications (event_id);


-- ---------------------------------------------------------------------
-- 3. Вспомогательные функции доступа
--
-- SECURITY DEFINER нужен, чтобы политики на profiles не вызывали
-- бесконечную рекурсию: функция читает profiles в обход RLS.
-- search_path = '' + полные имена — защита от подмены объектов.
-- Доступ определяется ТОЛЬКО через auth.uid() и profiles.id.
-- Email нигде не участвует. Для неавторизованного возвращается NULL/false.
-- ---------------------------------------------------------------------

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active = true
$fn$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select p.organization_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.is_active = true
$fn$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(public.current_role_name() = 'platform_admin', false)
$fn$;

-- Организация org находится в том же регионе, что и организация текущего
-- пользователя. NULL-регион НЕ совпадает ни с чем: пока region_id не
-- заполнен, regional_admin не получает доступа за пределы своей организации.
create or replace function public.is_same_region_as_current(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.organizations o_target
    join public.organizations o_self on o_self.region_id = o_target.region_id
    where o_target.id = org
      and o_target.region_id is not null
      and o_self.id = public.current_org_id()
  )
$fn$;

-- Административные права над организацией.
create or replace function public.can_manage_org(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.is_platform_admin()
      or (org is not null
          and public.current_role_name() in ('regional_admin','organization_admin')
          and public.current_org_id() = org)
      or (org is not null
          and public.current_role_name() = 'regional_admin'
          and public.is_same_region_as_current(org))
$fn$;

-- Сотрудник организации (любая активная роль) либо администратор над ней.
create or replace function public.is_staff_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.can_manage_org(org)
      or (org is not null and public.current_org_id() = org)
$fn$;

revoke all on function public.current_role_name()          from public;
revoke all on function public.current_org_id()             from public;
revoke all on function public.is_platform_admin()          from public;
revoke all on function public.is_same_region_as_current(uuid) from public;
revoke all on function public.can_manage_org(uuid)         from public;
revoke all on function public.is_staff_of(uuid)            from public;

-- EXECUTE выдаётся ТОЛЬКО authenticated.
-- Обоснование: ни одна политика с `to anon` не вызывает эти функции —
-- публичное чтение опирается только на status и is_active, а
-- applications_public_insert использует EXISTS-подзапросы. Функции в схеме
-- public автоматически публикуются PostgREST как /rest/v1/rpc/<имя>,
-- поэтому лишний GRANT для anon — лишняя открытая точка входа.
grant execute on function public.current_role_name()             to authenticated;
grant execute on function public.current_org_id()                to authenticated;
grant execute on function public.is_platform_admin()             to authenticated;
grant execute on function public.is_same_region_as_current(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid)            to authenticated;
grant execute on function public.is_staff_of(uuid)               to authenticated;


-- ---------------------------------------------------------------------
-- 4. Триггеры
-- ---------------------------------------------------------------------

-- 4.1 updated_at (regions его не имеет — по согласованной структуре)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end
$fn$;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at before update on public.news
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clubs_updated_at on public.clubs;
create trigger trg_clubs_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();

-- 4.2 Защита от самоповышения прав.
-- WITH CHECK в политике не видит старое значение строки, поэтому запрет
-- на смену role / organization_id / is_active реализован триггером.
-- Обычный сотрудник может править только своё имя.
-- Исключение — вызов без JWT (SQL editor, service_role): это и есть
-- контролируемый способ администрирования профилей.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if (select auth.uid()) is null
     or public.is_platform_admin()
     or public.can_manage_org(old.organization_id)
  then
    return new;
  end if;

  new.role            := old.role;
  new.organization_id := old.organization_id;
  new.is_active       := old.is_active;
  return new;
end
$fn$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- Триггерные функции не вызываются напрямую и не публикуются PostgREST
-- (возвращают trigger). EXECUTE отзывается у всех ролей для гигиены.
revoke all on function public.set_updated_at()                    from public;
revoke all on function public.profiles_guard_privileged_columns() from public;


-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.regions       enable row level security;
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.news          enable row level security;
alter table public.clubs         enable row level security;
alter table public.applications  enable row level security;

-- 5.0 regions -----------------------------------------------------------
drop policy if exists regions_public_read on public.regions;
create policy regions_public_read on public.regions
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists regions_platform_admin_all on public.regions;
create policy regions_platform_admin_all on public.regions
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- 5.1 organizations -----------------------------------------------------
drop policy if exists organizations_public_read on public.organizations;
create policy organizations_public_read on public.organizations
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists organizations_staff_read_own on public.organizations;
create policy organizations_staff_read_own on public.organizations
  for select to authenticated
  using (id = (select public.current_org_id()));

drop policy if exists organizations_admin_read_scope on public.organizations;
create policy organizations_admin_read_scope on public.organizations
  for select to authenticated
  using (public.can_manage_org(id));

drop policy if exists organizations_admin_update on public.organizations;
create policy organizations_admin_update on public.organizations
  for update to authenticated
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

drop policy if exists organizations_platform_admin_insert on public.organizations;
create policy organizations_platform_admin_insert on public.organizations
  for insert to authenticated
  with check ((select public.is_platform_admin()));

drop policy if exists organizations_platform_admin_delete on public.organizations;
create policy organizations_platform_admin_delete on public.organizations
  for delete to authenticated
  using ((select public.is_platform_admin()));

-- 5.2 profiles ----------------------------------------------------------
-- anon не имеет ни политик, ни GRANT на эту таблицу.
-- INSERT / DELETE политик нет намеренно: профили заводятся только
-- через SQL editor или service_role на сервере.
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_admin_read_scope on public.profiles;
create policy profiles_admin_read_scope on public.profiles
  for select to authenticated
  using (public.can_manage_org(organization_id));

drop policy if exists profiles_platform_admin_read_all on public.profiles;
create policy profiles_platform_admin_read_all on public.profiles
  for select to authenticated
  using ((select public.is_platform_admin()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.can_manage_org(organization_id) or (select public.is_platform_admin()))
  with check (public.can_manage_org(organization_id) or (select public.is_platform_admin()));

-- 5.3 events ------------------------------------------------------------
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists events_staff_read on public.events;
create policy events_staff_read on public.events
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists events_staff_insert on public.events;
create policy events_staff_insert on public.events
  for insert to authenticated
  with check (
    organization_id = (select public.current_org_id())
    and (status in ('draft','pending') or public.can_manage_org(organization_id))
  );

drop policy if exists events_staff_update_drafts on public.events;
create policy events_staff_update_drafts on public.events
  for update to authenticated
  using (organization_id = (select public.current_org_id()) and status in ('draft','pending'))
  with check (organization_id = (select public.current_org_id()) and status in ('draft','pending'));

drop policy if exists events_admin_all on public.events;
create policy events_admin_all on public.events
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

-- 5.4 news --------------------------------------------------------------
drop policy if exists news_public_read on public.news;
create policy news_public_read on public.news
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists news_staff_read on public.news;
create policy news_staff_read on public.news
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists news_staff_insert on public.news;
create policy news_staff_insert on public.news
  for insert to authenticated
  with check (
    organization_id = (select public.current_org_id())
    and (status in ('draft','pending') or public.can_manage_org(organization_id))
  );

drop policy if exists news_staff_update_drafts on public.news;
create policy news_staff_update_drafts on public.news
  for update to authenticated
  using (organization_id = (select public.current_org_id()) and status in ('draft','pending'))
  with check (organization_id = (select public.current_org_id()) and status in ('draft','pending'));

drop policy if exists news_admin_all on public.news;
create policy news_admin_all on public.news
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

-- 5.5 clubs -------------------------------------------------------------
drop policy if exists clubs_public_read on public.clubs;
create policy clubs_public_read on public.clubs
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists clubs_staff_read on public.clubs;
create policy clubs_staff_read on public.clubs
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists clubs_staff_insert on public.clubs;
create policy clubs_staff_insert on public.clubs
  for insert to authenticated
  with check (organization_id = (select public.current_org_id()));

drop policy if exists clubs_staff_update on public.clubs;
create policy clubs_staff_update on public.clubs
  for update to authenticated
  using (organization_id = (select public.current_org_id()))
  with check (organization_id = (select public.current_org_id()));

drop policy if exists clubs_admin_all on public.clubs;
create policy clubs_admin_all on public.clubs
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

-- 5.6 applications ------------------------------------------------------
-- Посетитель может только создать заявку и только при согласии.
-- Читать, изменять и удалять заявки anon не может: политик SELECT/UPDATE/
-- DELETE для anon нет, и GRANT на эти операции у anon отсутствует.
drop policy if exists applications_public_insert on public.applications;
create policy applications_public_insert on public.applications
  for insert to anon, authenticated
  with check (
    consent_given = true
    and status = 'new'
    and processed_by is null
    and processed_at is null
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.is_active = true
    )
    and (
      club_id is null
      or exists (
        select 1 from public.clubs c
        where c.id = club_id and c.organization_id = applications.organization_id
      )
    )
    and (
      event_id is null
      or exists (
        select 1 from public.events e
        where e.id = event_id and e.organization_id = applications.organization_id
      )
    )
  );

drop policy if exists applications_staff_read on public.applications;
create policy applications_staff_read on public.applications
  for select to authenticated
  using (public.is_staff_of(organization_id));

drop policy if exists applications_admin_update on public.applications;
create policy applications_admin_update on public.applications
  for update to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

drop policy if exists applications_admin_delete on public.applications;
create policy applications_admin_delete on public.applications
  for delete to authenticated
  using (public.can_manage_org(organization_id));


-- ---------------------------------------------------------------------
-- 6. Привилегии на уровне таблиц (второй рубеж после RLS)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.regions       to anon;
grant select on public.organizations to anon;
grant select on public.events        to anon;
grant select on public.news          to anon;
grant select on public.clubs         to anon;
grant insert on public.applications  to anon;

grant select, insert, update, delete on public.regions       to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.events        to authenticated;
grant select, insert, update, delete on public.news          to authenticated;
grant select, insert, update, delete on public.clubs         to authenticated;
grant select, insert, update, delete on public.applications  to authenticated;

grant select, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

commit;
