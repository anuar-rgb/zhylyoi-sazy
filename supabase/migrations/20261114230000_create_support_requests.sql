-- «Поддержка»: an institution's staff write to the platform owner from their panel, and the
-- conversation goes on there. Email only says that something new came in; the text stays here.
--
-- Closed like organization_mail_settings: RLS on, no policies, no grants for anon or authenticated.
-- Only the server's service role reads and writes, after checking who is asking (src/lib/support.ts):
-- an institution's staff see their own institution's requests, the platform admin sees all.
--
-- Screenshots go to the private bucket support-files, path <organization_id>/<request_id>/<file>;
-- shown through short-lived signed links, never a public address.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject text not null check (length(btrim(subject)) between 1 and 200),
  -- open: waiting for the platform; answered: the platform replied; closed: done.
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- When each side last opened the request, for the «new» badges.
  platform_seen_at timestamptz,
  organization_seen_at timestamptz
);

create index if not exists support_requests_org_idx on public.support_requests (organization_id, last_message_at desc);
create index if not exists support_requests_status_idx on public.support_requests (status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  from_platform boolean not null,
  body text not null check (length(btrim(body)) between 1 and 5000),
  -- Paths in the support-files bucket.
  images text[] not null default '{}' check (cardinality(images) <= 3),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_request_idx on public.support_messages (request_id, created_at);

comment on table public.support_requests is 'Institutions'' requests to the platform owner. Server only: no grants for anon or authenticated.';
comment on table public.support_messages is 'Messages of a support request. Server only: no grants for anon or authenticated.';

alter table public.support_requests enable row level security;
alter table public.support_messages enable row level security;

revoke all on public.support_requests from public, anon, authenticated;
revoke all on public.support_messages from public, anon, authenticated;
grant select, insert, update, delete on public.support_requests to service_role;
grant select, insert, update, delete on public.support_messages to service_role;

-- Private bucket: no storage policies, so only the service role reaches it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-files', 'support-files', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
