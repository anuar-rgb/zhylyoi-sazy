-- Groundwork for bank notifications (webhooks).
-- Keys: organization_payment_secrets already exists as a default-deny stub. It gets the real columns
-- and stays unreachable for anon and authenticated; only the server (service role) reads or writes it.
alter table public.organization_payment_secrets
  add column if not exists merchant_id text,
  add column if not exists secret_key text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_payment_secrets_method
  on public.organization_payment_secrets (organization_payment_method_id);

-- Journal of what banks told us. Also the idempotency guard: a bank retries a notification until
-- it gets an answer, and the same payment must never confirm (or reject) a booking twice.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_method_id uuid references public.organization_payment_methods(id) on delete set null,
  provider_code text not null,
  external_id text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2),
  status text not null check (status in ('confirmed', 'rejected', 'ignored')),
  reason text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_payment_events_external
  on public.payment_events (organization_id, provider_code, external_id);
create index if not exists idx_payment_events_booking on public.payment_events (booking_id);
create index if not exists idx_payment_events_org_created on public.payment_events (organization_id, created_at desc);

revoke all on public.payment_events from anon;
revoke all on public.payment_events from authenticated;
grant select on public.payment_events to authenticated;

alter table public.payment_events enable row level security;

-- Staff may read their own institution's journal. Nobody but the server writes to it.
create policy payment_events_staff_read on public.payment_events
  for select to authenticated
  using (public.is_staff_of(organization_id));
