import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import { CONTENT_DEFAULTS } from "@/lib/siteContent";
import type { Locale } from "@/i18n/routing";

export type ContentOverrides = Record<string, { kk: string | null; ru: string | null }>;

/**
 * What this institution changed, keyed by content key.
 *
 * Only overrides live in the table; anything absent falls back to the wording
 * declared in siteContent.ts. A failed query yields an empty map rather than
 * throwing, so a database hiccup shows the built-in text instead of a blank page.
 *
 * Cached for the render pass: several blocks of one page ask for it.
 */
export const getContentOverrides = cache(async (): Promise<ContentOverrides> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_content")
    .select("key, value_kk, value_ru")
    .eq("organization_id", organizationId);

  if (error || !data) return {};

  const overrides: ContentOverrides = {};
  for (const row of data as unknown as { key: string; value_kk: string | null; value_ru: string | null }[]) {
    overrides[row.key] = { kk: row.value_kk, ru: row.value_ru };
  }
  return overrides;
});

/**
 * A reader for one render pass: `text("hero.subtitle")`.
 *
 * Falls back in two steps — the institution's other language, then the built-in
 * wording — so a half-filled override never leaves a blank on the page.
 */
export async function getSiteText(locale: Locale): Promise<(key: string) => string> {
  const overrides = await getContentOverrides();

  return (key: string): string => {
    const override = overrides[key];
    const fallback = CONTENT_DEFAULTS[key];

    const own = locale === "kk" ? override?.kk : override?.ru;
    if (own) return own;

    const other = locale === "kk" ? override?.ru : override?.kk;
    if (other) return other;

    if (!fallback) return "";
    return locale === "kk" ? fallback.kk : fallback.ru;
  };
}

/**
 * Splits a written figure into the number a counter can animate and the rest.
 *
 * The editor types "10+" or "2026"; the counting component needs 10 and "+".
 */
export function splitStat(value: string): { end: number; suffix: string } {
  const match = /^\s*(\d+)(.*)$/.exec(value);
  if (!match) return { end: 0, suffix: value.trim() };
  return { end: Number(match[1]), suffix: match[2].trim() };
}
