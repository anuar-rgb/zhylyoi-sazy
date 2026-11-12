-- Restores the grants 20260917182152_harden_default_privileges.sql set on organizations. On the
-- self-hosted database (moved from Supabase Cloud on 2026-11-09) the table had every privilege for
-- anon and authenticated again, TRUNCATE included, which RLS does not limit.
--
-- Visitors read active institutions (organizations_public_read); staff read and edit their own
-- through the RLS policies. Nothing else is needed.

revoke all on public.organizations from anon;
revoke all on public.organizations from authenticated;
grant select on public.organizations to anon;
grant select, insert, update, delete on public.organizations to authenticated;
