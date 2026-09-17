import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client. Uses the publishable key only — never a service role key. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
