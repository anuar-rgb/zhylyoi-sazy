import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteDomainFor } from "@/lib/siteHost";
import { translateFieldPair } from "@/lib/autoTranslate";
import type { Locale } from "@/i18n/routing";
import type { MapPoint } from "@/lib/mapPoint";

/**
 * The domain a request from the server itself or from development stands for (siteHost.ts): the
 * first institution's unless SITE_FALLBACK_DOMAIN names another, e.g. a test copy run as the test
 * institution.
 */
const FALLBACK_DOMAIN = process.env.SITE_FALLBACK_DOMAIN?.trim() || "dk-zhylyoi.kz";

/**
 * The domain of the institution this request is for, from the Host header (Caddy passes the
 * visitor's on unchanged). Not X-Forwarded-Host: that one a visitor could send themselves.
 */
export const getSiteDomain = cache(async (): Promise<string | null> => {
  const h = await headers();
  return siteDomainFor(h.get("host"), FALLBACK_DOMAIN);
});

export type OrganizationRecord = {
  id: string;
  slug: string;
  type: string;
  /** The public site's address (dk-zhylyoi.kz), set by the platform admin; null without a site. */
  domain: string | null;
  nameKk: string | null;
  nameRu: string | null;
  addressKk: string | null;
  addressRu: string | null;
  phone: string | null;
  email: string | null;
  /** Official requisites shown on Contacts: the registered full name, BIN, director and founder. */
  legalNameKk: string | null;
  legalNameRu: string | null;
  bin: string | null;
  director: string | null;
  founderKk: string | null;
  founderRu: string | null;
  /** The building on the map, or null when staff have not set it. */
  mapPoint: MapPoint | null;
};

const COLUMNS =
  "id, slug, type, domain, name, name_kk, name_ru, address, address_kk, address_ru, phone, email, " +
  "legal_name_kk, legal_name_ru, bin, director, founder_kk, founder_ru, map_lat, map_lng";

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    type: String(row.type),
    domain: str(row.domain),
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
    legalNameKk: str(row.legal_name_kk),
    legalNameRu: str(row.legal_name_ru),
    bin: str(row.bin),
    director: str(row.director),
    founderKk: str(row.founder_kk),
    founderRu: str(row.founder_ru),
    mapPoint:
      typeof row.map_lat === "number" && typeof row.map_lng === "number" ? { lat: row.map_lat, lng: row.map_lng } : null,
  };
}

/**
 * The site's institution, found by the domain the visitor used, or null when no active
 * institution has that domain (the layouts then show «Сайт не найден»).
 *
 * Read through the public policy, which exposes only active institutions — the same
 * condition the application insert policy checks. The two therefore cannot disagree.
 *
 * Cached for the render pass: the footer, the contacts block and the page around
 * them all ask for it, and one round trip is enough.
 */
export const getSiteOrganization = cache(async (): Promise<OrganizationRecord | null> => {
  const domain = await getSiteDomain();
  if (!domain) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(COLUMNS)
    .eq("domain", domain)
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
 * The id is never hardcoded: it follows the domain, so the same code serves every institution.
 */
export const getSiteOrganizationId = cache(async (): Promise<string | null> => {
  const organization = await getSiteOrganization();
  return organization?.id ?? null;
});

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedOrganization(
  organization: OrganizationRecord,
  locale: Locale,
  field: "name" | "address" | "legalName" | "founder"
): string | null {
  // Field names here map one to one onto the record: nameKk/nameRu, addressKk/addressRu and so on.
  const kk = organization[`${field}Kk`];
  const ru = organization[`${field}Ru`];
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}
