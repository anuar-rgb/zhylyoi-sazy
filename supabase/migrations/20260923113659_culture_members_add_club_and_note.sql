-- =====================================================================
-- culture_members — артист принадлежит коллективу, а не учреждению
--
-- ИСПРАВЛЕНИЕ ОШИБКИ. Создавая таблицу, я привязал артистов к учреждению и
-- записал в миграции, что club_id не нужен, потому что «ансамбля в
-- culture_clubs не существует». Он не отсутствовал — он ещё не был перенесён.
--
-- С одним коллективом разницы не видно. С двумя — 18 артистов ансамбля и 16
-- артистов театра оказались бы одним списком, и администратор не смог бы
-- управлять составами раздельно. Ради этого всё и делалось.
--
-- club_id nullable: артист без коллектива остаётся допустимым, и привязка уже
-- существующих строк идёт отдельной миграцией, а не внутри этой.
-- on delete set null, а не cascade: удаление коллектива не должно стирать
-- карточки людей — они остаются в списке без привязки, и их видно.
--
-- note_* — регалии, которых у ансамбля нет, а у театральных есть:
-- «Отличник сферы культуры, почётный гражданин Жылыойского района».
-- =====================================================================

begin;

alter table public.culture_members
  add column if not exists club_id uuid references public.culture_clubs(id) on delete set null;

alter table public.culture_members
  add column if not exists note_kk text;

alter table public.culture_members
  add column if not exists note_ru text;

comment on column public.culture_members.club_id is
  'Коллектив, в котором состоит артист. Пусто — артист показывается в общем списке учреждения.';
comment on column public.culture_members.note_kk is
  'Звания и регалии одной строкой. Пусто — строка на карточке не рисуется.';

-- Список состава спрашивается по коллективу, а сортируется порядком.
create index if not exists idx_culture_members_club
  on public.culture_members (club_id, is_active, sort_order);

commit;
