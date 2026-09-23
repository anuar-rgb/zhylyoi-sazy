-- =====================================================================
-- culture_staff — сотрудники учреждения
--
-- Страница /staff держала список людей прямо в коде. Сменился директор —
-- нужен разработчик. Это ровно то, чего в панели быть не должно.
--
-- Форма таблицы повторяет culture_clubs: те же локализованные пары, тот же
-- images jsonb, тот же is_active. Одинаковая форма позволяет переиспользовать
-- политики, серверные действия и компонент формы почти без изменений —
-- см. AGENTS.md.
--
-- slug нет намеренно: у сотрудника нет своей страницы, он показывается
-- карточкой в общем списке. Появится страница — появится и колонка.
--
-- sort_order есть, потому что список людей не алфавитный: руководитель стоит
-- первым независимо от фамилии.
-- =====================================================================

begin;

create table if not exists public.culture_staff (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- Служебная колонка без суффикса остаётся NOT NULL и служит запасной,
  -- когда ни одна из локализованных пар не заполнена.
  name            text not null,
  name_kk         text,
  name_ru         text,

  role_kk         text,
  role_ru         text,

  description_kk  text,
  description_ru  text,

  phone           text,
  email           text,

  images          jsonb not null default '[]'::jsonb,

  sort_order      integer not null default 0,
  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.culture_staff is
  'Сотрудники учреждения для страницы /staff. Порядок задаётся sort_order: руководитель первым.';
comment on column public.culture_staff.name is
  'Запасное имя без языка. Показывается, только если не заполнена ни одна локализованная пара.';
comment on column public.culture_staff.sort_order is
  'Меньше — выше в списке. Одинаковые значения разбираются по имени.';
comment on column public.culture_staff.images is
  'Массив {url, path}, как у culture_clubs. Первая фотография — портрет на карточке.';

create index if not exists idx_culture_staff_org
  on public.culture_staff (organization_id, is_active, sort_order);

-- Поимённо: alter default privileges в Supabase раздаёт все права anon и
-- authenticated на каждую новую таблицу, включая TRUNCATE, который RLS не
-- ограничивает. revoke ... from public этого не снимает.
revoke all on public.culture_staff from anon;
revoke all on public.culture_staff from authenticated;

grant select on public.culture_staff to anon;
grant select, insert, update, delete on public.culture_staff to authenticated;

alter table public.culture_staff enable row level security;

-- Две политики, как у остальных таблиц контента после уборки политик эпохи
-- редактора: посетитель видит показанных, администратор делает всё.
drop policy if exists culture_staff_public_read on public.culture_staff;
create policy culture_staff_public_read on public.culture_staff
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists culture_staff_admin_all on public.culture_staff;
create policy culture_staff_admin_all on public.culture_staff
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

commit;
