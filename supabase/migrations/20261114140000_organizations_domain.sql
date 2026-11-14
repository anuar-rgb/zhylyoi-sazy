-- One site, many institutions: each institution's public site is found by its own domain
-- (dk-zhylyoi.kz → «Кең Жылыой»). The app reads the visitor's host, drops a leading "www." and
-- looks the institution up here.
--
-- Stored lowercase, without scheme, port, path or "www.". Unique: a domain shows one institution.
-- Null for an institution not yet given a site.
--
-- Only the platform's owner (platform_admin) sets the domain and switches a site on or off
-- (is_active): an institution's admin may edit its own card (organizations_admin_update), and a
-- domain changed from there could take over an address or take its own site down. A trigger
-- guards both columns for signed-in users; the service role and migrations are not limited.
--
-- No grants change: anon already reads active institutions (organizations_public_read) and the
-- domain is public anyway — it is the address the visitor typed.

alter table public.organizations add column if not exists domain text;

alter table public.organizations drop constraint if exists organizations_domain_format;
alter table public.organizations add constraint organizations_domain_format
  check (domain is null or domain ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' and domain !~ '^www\.');

create unique index if not exists organizations_domain_key on public.organizations (domain);

comment on column public.organizations.domain is
  'The institution''s public site address, lowercase, no scheme or "www." (dk-zhylyoi.kz). Set by the platform admin only.';

update public.organizations set domain = 'dk-zhylyoi.kz' where slug = 'ken-zhylyoi' and domain is null;

create or replace function public.organizations_guard_platform_fields()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if current_user in ('authenticated', 'anon')
     and not public.is_platform_admin()
     and (new.domain is distinct from old.domain or new.is_active is distinct from old.is_active) then
    raise exception 'only_platform_admin_changes_domain_or_active' using errcode = '42501';
  end if;
  return new;
end;
$fn$;

drop trigger if exists organizations_guard_platform_fields on public.organizations;
create trigger organizations_guard_platform_fields
  before update on public.organizations
  for each row execute function public.organizations_guard_platform_fields();
