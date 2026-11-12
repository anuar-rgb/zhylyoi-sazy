-- Restores the intended table grants for anon and authenticated on every public table.
--
-- After the move from Supabase Cloud to the self-hosted database on the VPS (2026-11-09) every table
-- had all privileges for anon and authenticated again (TRUNCATE, TRIGGER and REFERENCES included),
-- because the dump did not carry the revokes of 20260917182152_harden_default_privileges.sql and the
-- per-table migrations after it. RLS was still on everywhere, so rows stayed protected, but TRUNCATE is
-- not limited by RLS.
--
-- The grants below are what the migration history leaves for each table, replayed in order (renames
-- and drops followed). 20261112200000_organizations_grants.sql already did organizations; it is
-- repeated here so this file alone describes the whole set.
--
-- Rows stay governed by the RLS policies; these grants only say which kinds of statement each role may
-- attempt at all. Server code that needs more uses the service role (src/lib/supabase/admin.ts).

-- applications
revoke all on public.applications from anon;
revoke all on public.applications from authenticated;
grant insert on public.applications to anon;
grant delete, insert, select, update on public.applications to authenticated;

-- booking_actions
revoke all on public.booking_actions from anon;
revoke all on public.booking_actions from authenticated;
grant select on public.booking_actions to authenticated;

-- booking_items
revoke all on public.booking_items from anon;
revoke all on public.booking_items from authenticated;
grant select on public.booking_items to authenticated;

-- booking_notices
revoke all on public.booking_notices from anon;
revoke all on public.booking_notices from authenticated;

-- bookings
revoke all on public.bookings from anon;
revoke all on public.bookings from authenticated;
grant select on public.bookings to authenticated;

-- culture_clubs
revoke all on public.culture_clubs from anon;
revoke all on public.culture_clubs from authenticated;
grant select on public.culture_clubs to anon;
grant delete, insert, select, update on public.culture_clubs to authenticated;

-- culture_events
revoke all on public.culture_events from anon;
revoke all on public.culture_events from authenticated;
grant select on public.culture_events to anon;
grant delete, insert, select, update on public.culture_events to authenticated;

-- culture_members
revoke all on public.culture_members from anon;
revoke all on public.culture_members from authenticated;
grant select on public.culture_members to anon;
grant delete, insert, select, update on public.culture_members to authenticated;

-- culture_news
revoke all on public.culture_news from anon;
revoke all on public.culture_news from authenticated;
grant select on public.culture_news to anon;
grant delete, insert, select, update on public.culture_news to authenticated;

-- culture_repertoire
revoke all on public.culture_repertoire from anon;
revoke all on public.culture_repertoire from authenticated;
grant select on public.culture_repertoire to anon;
grant delete, insert, select, update on public.culture_repertoire to authenticated;

-- culture_staff
revoke all on public.culture_staff from anon;
revoke all on public.culture_staff from authenticated;
grant select on public.culture_staff to anon;
grant delete, insert, select, update on public.culture_staff to authenticated;

-- culture_videos
revoke all on public.culture_videos from anon;
revoke all on public.culture_videos from authenticated;
grant select on public.culture_videos to anon;
grant delete, insert, select, update on public.culture_videos to authenticated;

-- event_seat_blocks
revoke all on public.event_seat_blocks from anon;
revoke all on public.event_seat_blocks from authenticated;
grant select on public.event_seat_blocks to authenticated;

-- event_seat_categories
revoke all on public.event_seat_categories from anon;
revoke all on public.event_seat_categories from authenticated;
grant select on public.event_seat_categories to anon;
grant delete, insert, select, update on public.event_seat_categories to authenticated;

-- event_ticket_types
revoke all on public.event_ticket_types from anon;
revoke all on public.event_ticket_types from authenticated;
grant select on public.event_ticket_types to anon;
grant delete, insert, select, update on public.event_ticket_types to authenticated;

-- hall_categories
revoke all on public.hall_categories from anon;
revoke all on public.hall_categories from authenticated;
grant delete, insert, select, update on public.hall_categories to authenticated;

-- hall_row_layouts
revoke all on public.hall_row_layouts from anon;
revoke all on public.hall_row_layouts from authenticated;
grant select on public.hall_row_layouts to anon;
grant delete, insert, select, update on public.hall_row_layouts to authenticated;

-- hall_seats
revoke all on public.hall_seats from anon;
revoke all on public.hall_seats from authenticated;
grant select on public.hall_seats to anon;
grant delete, insert, select, update on public.hall_seats to authenticated;

-- halls
revoke all on public.halls from anon;
revoke all on public.halls from authenticated;
grant select on public.halls to anon;
grant delete, insert, select, update on public.halls to authenticated;

-- org_content
revoke all on public.org_content from anon;
revoke all on public.org_content from authenticated;
grant select on public.org_content to anon;
grant delete, insert, select, update on public.org_content to authenticated;

-- org_sections
revoke all on public.org_sections from anon;
revoke all on public.org_sections from authenticated;
grant delete, insert, select, update on public.org_sections to authenticated;

-- org_telegram
revoke all on public.org_telegram from anon;
revoke all on public.org_telegram from authenticated;
grant delete, insert, select, update on public.org_telegram to authenticated;

-- organization_payment_methods
revoke all on public.organization_payment_methods from anon;
revoke all on public.organization_payment_methods from authenticated;
grant select on public.organization_payment_methods to anon;
grant delete, insert, select, update on public.organization_payment_methods to authenticated;

-- organization_payment_secrets
revoke all on public.organization_payment_secrets from anon;
revoke all on public.organization_payment_secrets from authenticated;

-- organizations
revoke all on public.organizations from anon;
revoke all on public.organizations from authenticated;
grant select on public.organizations to anon;
grant delete, insert, select, update on public.organizations to authenticated;

-- payment_events
revoke all on public.payment_events from anon;
revoke all on public.payment_events from authenticated;
grant select on public.payment_events to authenticated;

-- payment_providers
revoke all on public.payment_providers from anon;
revoke all on public.payment_providers from authenticated;
grant select on public.payment_providers to anon;
grant select on public.payment_providers to authenticated;

-- payment_webhook_events
revoke all on public.payment_webhook_events from anon;
revoke all on public.payment_webhook_events from authenticated;
grant select on public.payment_webhook_events to authenticated;

-- payments
revoke all on public.payments from anon;
revoke all on public.payments from authenticated;
grant select on public.payments to authenticated;

-- profiles
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;

-- regions
revoke all on public.regions from anon;
revoke all on public.regions from authenticated;
grant select on public.regions to anon;
grant delete, insert, select, update on public.regions to authenticated;

-- ticket_checkins
revoke all on public.ticket_checkins from anon;
revoke all on public.ticket_checkins from authenticated;
grant select on public.ticket_checkins to authenticated;
