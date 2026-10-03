-- Consent of the person to have their data (name, photo, contact details) published on the site.
-- The form asks for it on every save; the date is kept as the record that it was given.
-- NULL means "not recorded": every row that predates this column starts that way and is
-- asked for the confirmation the next time it is edited.
alter table public.culture_staff add column if not exists consent_given_at timestamptz;
alter table public.culture_members add column if not exists consent_given_at timestamptz;
