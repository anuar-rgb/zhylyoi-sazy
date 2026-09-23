-- =====================================================================
-- culture_repertoire — произведения в репертуаре коллектива
--
-- Десять произведений жили массивом в коде страницы /repertoire, продублированным
-- на двух языках. Пополнение репертуара означало правку кода.
--
-- Форма повторяет остальные таблицы контента, но без images: у произведения нет
-- фотографии, на карточке рисуется нотный значок.
--
-- category хранит КОД, а не подпись. Страница красила метку, отыскивая
-- показанное слово в карте цветов, где лежали и «Кюй», и «Күй». Админ, написав
-- «Кюи», молча получил бы метку без цвета. Код опечатать нельзя — он из списка.
-- Подписи и цвета живут в src/lib/repertoireFields.ts.
--
-- CHECK на category намеренно нет — как и у culture_clubs.kind: новая категория
-- не должна требовать миграции. Неизвестный код читается как «другое».
-- =====================================================================

begin;

create table if not exists public.culture_repertoire (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- Служебная колонка без суффикса остаётся NOT NULL и служит запасной.
  title           text not null,
  title_kk        text,
  title_ru        text,

  author_kk       text,
  author_ru       text,

  note_kk         text,
  note_ru         text,

  category        text,

  sort_order      integer not null default 0,
  is_active       boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.culture_repertoire is
  'Произведения репертуара для страницы /repertoire. Порядок и номер на карточке задаёт sort_order.';
comment on column public.culture_repertoire.category is
  'Код категории: kui, folk_song, song, classical, terme, original, other. Подписи и цвета — в src/lib/repertoireFields.ts. CHECK нет намеренно.';
comment on column public.culture_repertoire.note_kk is
  'Примечание под автором: «Өңдеген: ...», «Сөзі: ...». Пусто — строка не рисуется.';

create index if not exists idx_culture_repertoire_org
  on public.culture_repertoire (organization_id, is_active, sort_order);

-- Поимённо: alter default privileges в Supabase раздаёт все права anon и
-- authenticated на каждую новую таблицу, включая TRUNCATE, который RLS не
-- ограничивает. revoke ... from public этого не снимает.
revoke all on public.culture_repertoire from anon;
revoke all on public.culture_repertoire from authenticated;

grant select on public.culture_repertoire to anon;
grant select, insert, update, delete on public.culture_repertoire to authenticated;

alter table public.culture_repertoire enable row level security;

drop policy if exists culture_repertoire_public_read on public.culture_repertoire;
create policy culture_repertoire_public_read on public.culture_repertoire
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists culture_repertoire_admin_all on public.culture_repertoire;
create policy culture_repertoire_admin_all on public.culture_repertoire
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

commit;
