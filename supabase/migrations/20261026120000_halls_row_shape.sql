-- Форма рядов зала на схеме мест: дугой (как было) или прямыми рядами.
-- Только рисование схемы — места, ряды и билеты не меняются.

alter table public.halls
  add column if not exists row_shape text not null default 'curved';

alter table public.halls
  drop constraint if exists halls_row_shape_check;

alter table public.halls
  add constraint halls_row_shape_check check (row_shape in ('curved', 'straight'));

comment on column public.halls.row_shape is
  'Как рисовать ряды на схеме мест: curved — дугой, straight — прямыми рядами.';
