import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

/**
 * A club or creative collective.
 *
 * `path` is null for images that live outside our bucket — the seeded stock photos
 * point at Pexels. Only a non-null path can be removed from Storage.
 */
export type CultureClubImage = { url: string; path: string | null };

export type CultureClubKind = "club" | "creative_collective";

export type CultureClubRecord = {
  id: string;
  organizationId: string;
  kind: string;
  slug: string | null;
  isActive: boolean;
  nameKk: string | null;
  nameRu: string | null;
  directionKk: string | null;
  directionRu: string | null;
  descriptionKk: string | null;
  descriptionRu: string | null;
  fullTextKk: string | null;
  fullTextRu: string | null;
  scheduleKk: string | null;
  scheduleRu: string | null;
  ageRange: string | null;
  managerName: string | null;
  contactPhone: string | null;
  capacity: number | null;
  images: CultureClubImage[];
};

const COLUMNS =
  "id, organization_id, kind, slug, is_active, name, name_kk, name_ru, " +
  "direction_kk, direction_ru, description_kk, description_ru, " +
  "full_text_kk, full_text_ru, schedule_kk, schedule_ru, " +
  "age_range, manager_name, contact_phone, capacity, images";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** images is jsonb, so it arrives as parsed JSON of unknown shape. */
function toImages(value: unknown): CultureClubImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const url = (item as { url?: unknown }).url;
    if (typeof url !== "string") return [];
    const path = (item as { path?: unknown }).path;
    return [{ url, path: typeof path === "string" ? path : null }];
  });
}

function toRecord(row: Row): CultureClubRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    kind: String(row.kind ?? "club"),
    slug: str(row.slug),
    isActive: row.is_active === true,
    // name is the non-null service column; it backs the localized ones when a
    // translation is missing, so the UI never shows an empty title.
    nameKk: str(row.name_kk) ?? str(row.name),
    nameRu: str(row.name_ru) ?? str(row.name),
    directionKk: str(row.direction_kk),
    directionRu: str(row.direction_ru),
    descriptionKk: str(row.description_kk),
    descriptionRu: str(row.description_ru),
    fullTextKk: str(row.full_text_kk),
    fullTextRu: str(row.full_text_ru),
    scheduleKk: str(row.schedule_kk),
    scheduleRu: str(row.schedule_ru),
    ageRange: str(row.age_range),
    managerName: str(row.manager_name),
    contactPhone: str(row.contact_phone),
    capacity: typeof row.capacity === "number" ? row.capacity : null,
    images: toImages(row.images),
  };
}

/** Picks the viewer's language, falling back to the other one rather than showing nothing. */
export function localized(record: CultureClubRecord, locale: Locale, field: "name" | "direction" | "description" | "fullText" | "schedule"): string | null {
  const kk = record[`${field}Kk` as keyof CultureClubRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureClubRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/**
 * Splits the stored long description into paragraphs on blank lines, which is what
 * the hint under the admin textarea promises.
 */
export function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Clubs the caller may see. RLS decides the scope: staff get their own
 * institution's rows including hidden ones, anonymous visitors get only active ones.
 *
 * A failed query returns an empty list rather than throwing, so one bad request
 * cannot take down the page around it.
 */
export async function listCultureClubs(kind?: CultureClubKind): Promise<CultureClubRecord[]> {
  const supabase = await createClient();
  const query = supabase.from("culture_clubs").select(COLUMNS).order("name");
  const { data, error } = kind ? await query.eq("kind", kind) : await query;

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One club by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureClubById(id: string): Promise<CultureClubRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_clubs").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * One published club of this site's institution, by its public address.
 *
 * Scoped to the organization deliberately. The read policy publishes every active
 * club on the platform, so without this filter another institution's club would
 * surface here the moment a second one joins: RLS keeps tenants out of each other's
 * private data, but deciding whose clubs this site shows is the application's job.
 *
 * Filters on is_active as well, because RLS hides inactive rows only from anonymous
 * visitors — a signed-in staff member would otherwise open a hidden club at its
 * public address and conclude it is live.
 *
 * Memoized per request, so the page and its generateMetadata share one query.
 */
export const getPublicCultureClubBySlug = cache(
  async (slug: string, kind: CultureClubKind = "club"): Promise<CultureClubRecord | null> => {
    const organizationId = await getSiteOrganizationId();
    if (!organizationId) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("culture_clubs")
      .select(COLUMNS)
      .eq("organization_id", organizationId)
      .eq("slug", slug)
      .eq("kind", kind)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;
    return toRecord(data as unknown as Row);
  }
);

/** Active clubs of this site's institution, for the public section. Scoped for the same reason. */
export const listPublicCultureClubs = cache(async (kind: CultureClubKind = "club"): Promise<CultureClubRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_clubs")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
});
