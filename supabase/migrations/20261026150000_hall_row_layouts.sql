-- =====================================================================
-- hall_row_layouts — настройки отдельных рядов зала
--
-- Для неполных рядов и смещения мест: сколько мест в ряду и как ряд стоит
-- относительно полной ширины сектора (по центру, слева, справа или со
-- сдвигом на N мест слева). Строка есть только у настроенного ряда;
-- остальные ряды рисуются по центру, как раньше.
--
-- Число мест само по себе ничего не рисует: места ряда по-прежнему в
-- hall_seats (лишние скрыты, is_active = false), здесь только запоминается
-- настройка, чтобы показать её в форме и не рисовать скрытые хвосты ряда.
-- =====================================================================

begin;

create table if not exists public.hall_row_layouts (
  hall_id      uuid not null references public.halls(id) on delete cascade,
  section      text not null default 'parter',
  row_label    text not null,
  seat_count   integer,
  alignment    text not null default 'center',
  offset_start integer not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (hall_id, section, row_label),
  constraint chk_hall_row_layouts_section check (section in ('parter', 'left', 'right', 'balcony')),
  constraint chk_hall_row_layouts_seat_count check (seat_count is null or seat_count between 1 and 200),
  constraint chk_hall_row_layouts_alignment check (alignment in ('center', 'left', 'right', 'custom')),
  constraint chk_hall_row_layouts_offset check (offset_start between 0 and 200)
);

comment on table public.hall_row_layouts is
  'Настройка отдельного ряда зала: число мест и выравнивание (center/left/right/custom со сдвигом offset_start мест слева).';

revoke all on public.hall_row_layouts from anon;
revoke all on public.hall_row_layouts from authenticated;
grant select on public.hall_row_layouts to anon;
grant select, insert, update, delete on public.hall_row_layouts to authenticated;

alter table public.hall_row_layouts enable row level security;

-- Читать может каждый, кто видит зал (схема мест у покупателя), — как hall_seats.
drop policy if exists hall_row_layouts_public_read on public.hall_row_layouts;
create policy hall_row_layouts_public_read on public.hall_row_layouts
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_row_layouts.hall_id and h.is_active = true
    )
  );

drop policy if exists hall_row_layouts_staff_all on public.hall_row_layouts;
create policy hall_row_layouts_staff_all on public.hall_row_layouts
  for all to authenticated
  using (
    exists (
      select 1 from public.halls h
      where h.id = hall_row_layouts.hall_id and public.is_staff_of(h.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.halls h
      where h.id = hall_row_layouts.hall_id and public.is_staff_of(h.organization_id)
    )
  );

commit;
