import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The institution this site belongs to. A constant while the platform serves one
 * house of culture; once it serves several, this comes from the route instead.
 */
export const SITE_ORGANIZATION_SLUG = "ken-zhylyoi";

/**
 * The site's organization id, or null when it cannot be resolved.
 *
 * Read through the public policy, which exposes only active institutions — the same
 * condition the application insert policy checks. The two therefore cannot disagree:
 * a hidden institution fails here rather than producing a row the database rejects.
 *
 * The id is never hardcoded, so the same code works against any environment holding
 * this slug.
 */
export const getSiteOrganizationId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", SITE_ORGANIZATION_SLUG)
    .maybeSingle();

  if (error || !data) return null;

  const id: unknown = data.id;
  return typeof id === "string" ? id : null;
});
