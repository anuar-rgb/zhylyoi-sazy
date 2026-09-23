-- =====================================================================
-- culture_members — артисты творческого коллектива
--
-- Восемнадцать человек жили массивом в коде страницы /members, продублированным
-- на двух языках. Новый артист или уход прежнего означал правку кода.
--
-- Форма повторяет culture_staff, которая повторяет culture_clubs: те же
-- локализованные пары, тот же images jsonb, тот же sort_order. Одинаковая форма
-- и позволяет переиспользовать политики и компонент формы — см. AGENTS.md.
--
-- Колонки club_id нет намеренно. Ансамбля в culture_clubs не существует — там
-- только четыре кружка, — и привязывать состав не к чему. Появится второй
-- коллектив со своим составом — добавится ALTER TABLE ADD COLUMN, это дешевле,
-- чем колонка, в которую сегодня никто не пишет.
--
-- has_higher_education отдельным булевым полем, а не сравнением текста уровня
-- со словом «высшее». Страница красит значок в золотой у тех, у кого высшее; с
-- редактируемым текстом опечатка или заглавная буква молча меняли бы цвет.
-- Что показывается и что решается — разные вещи.
-- =====================================================================

begin;

create table if not exists public.culture_members (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,

  -- Служебная колонка без суффикса остаётся NOT NULL и служит запасной.
  name                  text not null,
  name_kk               text,
  name_ru               text,

  role_kk               text,
  role_ru               text,

  education_kk          text,
  education_ru          text,

  specialty_kk          text,
  specialty_ru          text,

  level_kk              text,
  level_ru              text,
  has_higher_education  boolean not null default false,

  images                jsonb not null default '[]'::jsonb,

  sort_order            integer not null default 0,
  is_active             boolean not null default true,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.culture_members is
  'Артисты творческого коллектива для страницы /members. Порядок задаётся sort_order.';
comment on column public.culture_members.level_kk is
  'Уровень образования словами, как его показать: «жоғары», «арнаулы орта».';
comment on column public.culture_members.has_higher_education is
  'Решает цвет значка на карточке. Отдельно от level_*, чтобы опечатка в тексте не меняла оформление.';
comment on column public.culture_members.images is
  'Массив {url, path}, как у culture_clubs. path = null у файлов вне нашего бакета — их нельзя удалить из хранилища.';

create index if not exists idx_culture_members_org
  on public.culture_members (organization_id, is_active, sort_order);

-- Поимённо: alter default privileges в Supabase раздаёт все права anon и
-- authenticated на каждую новую таблицу, включая TRUNCATE, который RLS не
-- ограничивает. revoke ... from public этого не снимает.
revoke all on public.culture_members from anon;
revoke all on public.culture_members from authenticated;

grant select on public.culture_members to anon;
grant select, insert, update, delete on public.culture_members to authenticated;

alter table public.culture_members enable row level security;

-- Две политики, как у остальных таблиц контента: посетитель видит показанных,
-- администратор делает всё.
drop policy if exists culture_members_public_read on public.culture_members;
create policy culture_members_public_read on public.culture_members
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists culture_members_admin_all on public.culture_members;
create policy culture_members_admin_all on public.culture_members
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

commit;
