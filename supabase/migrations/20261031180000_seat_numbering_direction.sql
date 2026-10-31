-- =====================================================================
-- Направление нумерации мест: слева направо (как было) или справа налево
--
-- Только рисование схемы: номер места в базе, в билете, в PDF и на входе не
-- меняется. При «справа налево» место №1 рисуется у правого края ряда.
--
--   halls.seat_numbering                — для всего зала, по умолчанию 'ltr';
--   hall_row_layouts.numbering_direction — для отдельного ряда; пусто = как у зала.
--
-- Добавляются только новые столбцы, существующие данные не меняются.
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

alter table public.halls
  add column if not exists seat_numbering text not null default 'ltr';
alter table public.halls drop constraint if exists halls_seat_numbering_check;
alter table public.halls
  add constraint halls_seat_numbering_check check (seat_numbering in ('ltr', 'rtl'));
comment on column public.halls.seat_numbering is
  'С какой стороны ряда место №1 на схеме: ltr — слева, rtl — справа. Номера мест не меняет.';

alter table public.hall_row_layouts
  add column if not exists numbering_direction text;
alter table public.hall_row_layouts drop constraint if exists chk_hall_row_layouts_numbering;
alter table public.hall_row_layouts
  add constraint chk_hall_row_layouts_numbering check (numbering_direction is null or numbering_direction in ('ltr', 'rtl'));
comment on column public.hall_row_layouts.numbering_direction is
  'Направление нумерации этого ряда; пусто — как у зала (halls.seat_numbering).';

commit;
