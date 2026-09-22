-- =====================================================================
-- org_content — редактируемые надписи сайта
--
-- Заводить по колонке на каждую надпись нельзя: их около сорока, и каждая
-- новая потребовала бы миграцию. Поэтому ключ — значение.
--
-- ВАЖНО: заготовки живут в коде (src/lib/siteContent.ts), в таблице лежат
-- только правки конкретного учреждения. Отсюда три следствия: миграция
-- ничего не заполняет, сайт до первой правки выглядит как прежде, и в
-- таблице всегда виден ответ на вопрос «что здесь переписали». Очистка
-- поля удаляет строку и возвращает исходный текст — тогда правка заготовки
-- в коде дойдёт до всех, кто это поле не трогал.
--
-- Публичное чтение открыто намеренно: это надписи на страницах, их и так
-- видит каждый посетитель.
-- =====================================================================

begin;

create table if not exists public.org_content (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key             text not null,
  value_kk        text,
  value_ru        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_org_content unique (organization_id, key)
);

create index if not exists idx_org_content_org on public.org_content (organization_id);

alter table public.org_content enable row level security;

drop policy if exists org_content_public_read on public.org_content;
create policy org_content_public_read on public.org_content
  for select to anon, authenticated
  using (true);

drop policy if exists org_content_admin_all on public.org_content;
create policy org_content_admin_all on public.org_content
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create trigger trg_org_content_updated_at
  before update on public.org_content
  for each row execute function public.set_updated_at();

-- Новая таблица наследует полные права для anon и authenticated из-за
-- alter default privileges Supabase, включая TRUNCATE, который RLS не
-- ограничивает. Отзываем поимённо.
revoke all on public.org_content from anon;
revoke all on public.org_content from authenticated;

grant select on public.org_content to anon;
grant select, insert, update, delete on public.org_content to authenticated;

commit;
