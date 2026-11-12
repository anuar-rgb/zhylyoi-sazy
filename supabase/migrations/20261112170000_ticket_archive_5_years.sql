-- Заказы и билеты хранятся 5 лет после мероприятия, а не 3: так требует договор интернет-эквайринга
-- Halyk Bank (п. 7.3.4 «хранить информацию о Заказе… в течение 5 лет»). До этого срока мероприятие
-- с выданными билетами удалить нельзя (триггер culture_events_guard_delete). Тот же срок в коде:
-- TICKET_ARCHIVE_YEARS в src/lib/eventArchive.ts.

create or replace function public.event_archive_until(p_event public.culture_events)
returns timestamptz
language sql
stable
set search_path = ''
as $fn$
  select coalesce(p_event.end_date, p_event.event_date) + interval '5 years';
$fn$;
