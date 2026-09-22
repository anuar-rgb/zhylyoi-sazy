-- Реестр разделов админки для каждой организации.
-- Платформа обслуживает разные типы учреждений: у сотрудника библиотеки
-- пункта «Кружки» не должно быть в меню физически.
-- Фильтрация меню по этой таблице на этом шаге НЕ подключается.

create table if not exists public.org_sections (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Ключ раздела совпадает с именем таблицы контента: culture_clubs,
  -- library_reading_groups и так далее.
  section_key     text not null,
  label_kk        text not null,
  label_ru        text not null,
  is_enabled      boolean not null default true,
  sort_order      integer not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_org_sections_org_key unique (organization_id, section_key)
);

create index if not exists idx_org_sections_org_enabled
  on public.org_sections (organization_id, is_enabled, sort_order);

alter table public.org_sections enable row level security;

create policy org_sections_staff_read on public.org_sections
  for select to authenticated
  using (public.is_staff_of(organization_id));

create policy org_sections_admin_all on public.org_sections
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

-- anon не получает ничего: это внутренний реестр меню, а не публичные данные.

create trigger trg_org_sections_updated_at
  before update on public.org_sections
  for each row execute function public.set_updated_at();

-- Новая таблица наследует полные права для anon и authenticated из-за
-- alter default privileges Supabase, включая TRUNCATE, который RLS не
-- ограничивает. Отзываем поимённо.
revoke all on public.org_sections from anon;
revoke all on public.org_sections from authenticated;

grant select, insert, update, delete on public.org_sections to authenticated;

-- DO NOTHING, а не DO UPDATE: повторный прогон не затирает правки из админки.
insert into public.org_sections (organization_id, section_key, label_kk, label_ru, is_enabled, sort_order)
select o.id, 'culture_clubs', 'Үйірмелер', 'Кружки', true, 30
from public.organizations o
where o.slug = 'ken-zhylyoi'
on conflict (organization_id, section_key) do nothing;
