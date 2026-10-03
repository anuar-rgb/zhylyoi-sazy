-- When the buyer ticked the consent to personal data processing on the booking form. Set by the
-- server right after the booking is created; NULL for bookings made before the form asked.
alter table public.bookings add column if not exists consent_given_at timestamptz;
