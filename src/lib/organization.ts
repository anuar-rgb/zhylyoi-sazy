import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { translateFieldPair } from "@/lib/autoTranslate";
import type { Locale } from "@/i18n/routing";

/**
 * The institution this site belongs to. A constant while the platform serves one
 * house of culture; once it serves several, this comes from the route instead.
 */
export const SITE_ORGANIZATION_SLUG = "ken-zhylyoi";

export type OrganizationRecord = {
  id: string;
  slug: string;
  type: string;
  nameKk: string | null;
  nameRu: string | null;
  addressKk: string | null;
  addressRu: string | null;
  phone: string | null;
  email: string | null;
};

const COLUMNS = "id, slug, type, name, name_kk, name_ru, address, address_kk, address_ru, phone, email";

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    type: String(row.type),
    // Not backed by the older single-language columns here: that would make a
    // name or address typed in only one language look, to translateFieldPair
    // below, as if both were already filled — masking a gap instead of letting
    // it be translated.
    nameKk: str(row.name_kk),
    nameRu: str(row.name_ru),
    addressKk: str(row.address_kk),
    addressRu: str(row.address_ru),
    phone: str(row.phone),
    email: str(row.email),
  };
}

/**
 * The site's institution, or null when it cannot be resolved.
 *
 * Read through the public policy, which exposes only active institutions — the same
 * condition the application insert policy checks. The two therefore cannot disagree.
 *
 * Cached for the render pass: the footer, the contacts block and the page around
 * them all ask for it, and one round trip is enough.
 */
export const getSiteOrganization = cache(async (): Promise<OrganizationRecord | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(COLUMNS)
    .eq("slug", SITE_ORGANIZATION_SLUG)
    .maybeSingle();

  if (error || !data) return null;
  const record = toRecord(data as unknown as Record<string, unknown>);
  const [withName] = await translateFieldPair([record], "nameKk", "nameRu");
  const [filled] = await translateFieldPair([withName], "addressKk", "addressRu");
  return filled;
});

/**
 * The site's organization id, or null when it cannot be resolved.
 *
 * The id is never hardcoded, so the same code works against any environment
 * holding this slug.
 */
export const getSiteOrganizationId = cache(async (): Promise<string | null> => {
  const organization = await getSiteOrganization();
  return organization?.id ?? null;
});

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedOrganization(
  organization: OrganizationRecord,
  locale: Locale,
  field: "name" | "address"
): string | null {
  const kk = field === "name" ? organization.nameKk : organization.addressKk;
  const ru = field === "name" ? organization.nameRu : organization.addressRu;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}
