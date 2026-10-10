-- =====================================================================
-- Одна категория VIP и одна «Стандарт», как бы их ни написали
--
-- Категория места — свободный текст, и в залах накопились «вип» по-кириллице
-- рядом с VIP: в списке это выглядело как две разные категории. Теперь сайт
-- сам приводит написание к одному значению при сохранении; эта миграция
-- приводит к нему то, что уже записано.
--
-- «вип», «VIP», «Vip» → vip; «стандарт», «Standard» → standard.
-- Цена мероприятия или зала переносится, только если у него ещё нет цены
-- для итоговой категории: двух цен на одну категорию быть не может, и
-- существующая не затирается.
--
-- Применяется вручную в Supabase SQL Editor. Повторный запуск безопасен.
-- =====================================================================

begin;

update public.hall_seats
set category = 'vip'
where lower(trim(category)) in ('vip', 'вип') and category <> 'vip';

update public.hall_seats
set category = 'standard'
where lower(trim(category)) in ('standard', 'standart', 'стандарт') and category <> 'standard';

update public.event_seat_categories
set category = 'vip'
where lower(trim(category)) in ('vip', 'вип') and category <> 'vip';

-- «standard» в переопределении мероприятия — то же, что его отсутствие.
delete from public.event_seat_categories
where lower(trim(category)) in ('standard', 'standart', 'стандарт');

update public.event_ticket_types t
set category = 'vip'
where lower(trim(t.category)) in ('vip', 'вип') and t.category <> 'vip'
  and not exists (select 1 from public.event_ticket_types x where x.event_id = t.event_id and x.category = 'vip');

update public.event_ticket_types t
set category = 'standard'
where lower(trim(t.category)) in ('standard', 'standart', 'стандарт') and t.category <> 'standard'
  and not exists (select 1 from public.event_ticket_types x where x.event_id = t.event_id and x.category = 'standard');

update public.hall_category_prices p
set category = 'vip'
where lower(trim(p.category)) in ('vip', 'вип') and p.category <> 'vip'
  and not exists (select 1 from public.hall_category_prices x where x.hall_id = p.hall_id and x.category = 'vip');

update public.hall_category_prices p
set category = 'standard'
where lower(trim(p.category)) in ('standard', 'standart', 'стандарт') and p.category <> 'standard'
  and not exists (select 1 from public.hall_category_prices x where x.hall_id = p.hall_id and x.category = 'standard');

commit;

-- Проверка (ничего не меняет): должны остаться только standard, vip и свои категории.
-- select category, count(*) from public.hall_seats group by category order by category;
