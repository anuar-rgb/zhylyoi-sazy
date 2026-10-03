-- A link the buyer can open to pay (Kaspi / Halyk), shown on /my-ticket next to the QR.
-- https only: the value is rendered as a link on a public page, so a javascript: or data:
-- address must never get in, whatever the admin form checks.
alter table public.organization_payment_methods add column if not exists payment_url text;
alter table public.organization_payment_methods
  add constraint organization_payment_methods_payment_url_https
  check (payment_url is null or payment_url ~* '^https://[^\s]+$');
