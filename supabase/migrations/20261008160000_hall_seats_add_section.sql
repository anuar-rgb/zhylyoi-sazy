-- =====================================================================
-- hall_seats.section — сектора зала: партер, левый, правый, балкон
--
-- Зал дома культуры — не всегда одна сетка перед сценой: бывают боковые
-- ряды слева и справа и балкон. Каждое место теперь принадлежит сектору,
-- и нумерация рядов и мест своя в каждом секторе («Балкон, ряд 2,
-- место 5»), поэтому уникальность места — в пределах сектора.
--
-- Все уже существующие места — партер (значение по умолчанию), так что
-- залы, мероприятия, брони и билеты остаются ровно такими, как были.
-- Функции create_booking, get_booking_by_token, check_in_ticket не
-- меняются: они работают с id места, а сектор приложение дочитывает само.
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

alter table public.hall_seats add column if not exists section text not null default 'parter';

alter table public.hall_seats drop constraint if exists chk_hall_seats_section;
alter table public.hall_seats
  add constraint chk_hall_seats_section check (section in ('parter', 'left', 'right', 'balcony'));

comment on column public.hall_seats.section is
  'Сектор зала: parter (перед сценой), left, right (боковые), balcony. Ряды и места нумеруются внутри сектора.';

-- Одно и то же «ряд 1, место 1» теперь может быть и в партере, и на балконе.
alter table public.hall_seats drop constraint if exists uq_hall_seats_position;
alter table public.hall_seats
  add constraint uq_hall_seats_position unique (hall_id, section, row_label, seat_number);

commit;
