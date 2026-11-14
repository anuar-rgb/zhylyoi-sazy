-- Which edition of the platform's documents a person accepted (the offer, section 4.3; the privacy
-- policy, section 10.3). The version is the edition's date from src/lib/legalDocs.ts.
--
-- bookings: the offer is accepted with its own tick, apart from the consent to personal data
-- (consent_given_at, already there). Both are written by the server after the booking is created.
-- applications: the consent to personal data of a club application; its moment is created_at.
--
-- No grants change: bookings are written by the server's service role only, and anon's INSERT on
-- applications is table-wide, so it covers the new column; the insert policy is unchanged.

alter table public.bookings add column if not exists offer_accepted_at timestamptz;
alter table public.bookings add column if not exists offer_version text;
alter table public.bookings add column if not exists privacy_version text;

alter table public.applications add column if not exists privacy_version text;

comment on column public.bookings.offer_accepted_at is 'When the buyer ticked acceptance of the public offer.';
comment on column public.bookings.offer_version is 'Edition (YYYY-MM-DD) of the public offer the buyer accepted.';
comment on column public.bookings.privacy_version is 'Edition (YYYY-MM-DD) of the privacy policy the buyer consented under.';
comment on column public.applications.privacy_version is 'Edition (YYYY-MM-DD) of the privacy policy the applicant consented under.';
