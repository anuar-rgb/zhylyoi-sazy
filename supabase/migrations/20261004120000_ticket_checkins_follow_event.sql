-- When an event is deleted in the admin, everything about its tickets goes with it. The check-in
-- journal used to keep its rows with the event emptied out; now the rows of that event's tickets
-- are deleted together with the event.
--
-- Bookings, tickets (booking_items), payments and ticket types already go with the event.
-- Not touched on purpose: payment_webhook_events, which belongs to the payment method and
-- holds only technical facts (no names, no phone numbers, no request bodies).
--
-- Applied by hand in the Supabase SQL Editor. Safe to run again.
alter table public.ticket_checkins
  drop constraint if exists ticket_checkins_ticket_event_id_fkey;

alter table public.ticket_checkins
  add constraint ticket_checkins_ticket_event_id_fkey
  foreign key (ticket_event_id) references public.culture_events(id) on delete cascade;
