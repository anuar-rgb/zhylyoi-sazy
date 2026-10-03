import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service-role key: it bypasses RLS entirely.
 *
 * Server only, and only where there is no signed-in user to act as: a bank's notification, or
 * reading the bank secrets, which no browser-facing role may touch. Never import this into a
 * client component, and never pass anything it returns to one without picking fields.
 *
 * Returns null when the key is not configured, so callers can answer "not set up" rather than crash.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") throw new Error("createAdminClient must not run in the browser");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
