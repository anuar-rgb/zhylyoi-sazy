-- An event's own payment method must belong to the event's institution. Without this, one
-- institution's event could point at another's method, and buyers would be shown that other
-- institution's QR and link: money to the wrong account.
--
-- Applied by hand in the Supabase SQL Editor (not through apply_migration), so the version in
-- supabase_migrations does not list it. Safe to run again: create or replace + drop if exists.
create or replace function public.check_event_payment_method_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.payment_method_id is not null and not exists (
    select 1 from public.organization_payment_methods m
    where m.id = new.payment_method_id and m.organization_id = new.organization_id
  ) then
    raise exception 'payment_method_other_organization' using errcode = '23514';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_culture_events_payment_method_org on public.culture_events;
create trigger trg_culture_events_payment_method_org
  before insert or update of payment_method_id, organization_id on public.culture_events
  for each row execute function public.check_event_payment_method_org();
