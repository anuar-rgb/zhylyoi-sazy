-- Each institution sends its own emails (tickets, cancel and move notices, controller invitations)
-- through its own mailbox, usually on its own domain's mail hosting. Until now there was one
-- mailbox for the whole server (SMTP_* in its environment).
--
-- The platform owner enters these settings (Настройки → «Почта для писем», shown to the platform
-- admin only); the institution sees whether mail is set up and from which address, never the
-- password.
--
-- Closed like organization_payment_secrets: RLS on, no policies, and no grants for anon or
-- authenticated. Only the server's service role reads or writes it (src/lib/supabase/admin.ts).
-- The password is never logged and never sent to a browser.

create table if not exists public.organization_mail_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  smtp_host text not null check (length(smtp_host) between 3 and 255),
  smtp_port integer not null default 465 check (smtp_port between 1 and 65535),
  smtp_user text not null check (length(smtp_user) between 3 and 255),
  smtp_password text not null check (length(smtp_password) between 1 and 500),
  -- The sender's address; the login when null (the usual case: mailbox = login).
  from_address text check (from_address is null or from_address ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Where buyers' replies go; the sender's address when null.
  reply_to text check (reply_to is null or reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

comment on table public.organization_mail_settings is
  'Each institution''s outgoing mailbox (SMTP). Server only: no grants for anon or authenticated.';

alter table public.organization_mail_settings enable row level security;

revoke all on public.organization_mail_settings from public;
revoke all on public.organization_mail_settings from anon;
revoke all on public.organization_mail_settings from authenticated;
grant select, insert, update, delete on public.organization_mail_settings to service_role;
