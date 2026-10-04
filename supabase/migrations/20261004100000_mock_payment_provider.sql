-- A pretend payment provider for development and tests. No money moves through it.
--
-- The row only makes it possible to create a payment method that points at the mock. The code
-- refuses to use the mock when NODE_ENV is "production" (src/lib/payments/registry.ts), and the
-- admin hides it from the provider list there, so on the live site it cannot be chosen or used.
--
-- Applied by hand in the Supabase SQL Editor. Safe to run again.
insert into public.payment_providers (code, name, integration_type)
values ('mock', 'Mock (тест, без денег)', 'api_webhook')
on conflict (code) do nothing;
