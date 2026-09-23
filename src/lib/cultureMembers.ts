import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

/** Same shape as a club's image: `path` is null for anything outside our bucket. */
export type MemberImage = { url: string; path: string | null };

export type CultureMemberRecord = {
  id: string;
  organizationId: string;
  isActive: boolean;
  nameKk: string | null;
  nameRu: string | null;
  roleKk: string | null;
  roleRu: string | null;
  educationKk: string | null;
  educationRu: string | null;
  specialtyKk: string | null;
  specialtyRu: string | null;
  levelKk: string | null;
  levelRu: string | null;
  /**
   * Decides the colour of the badge on the card.
   *
   * Kept apart from the level text because that text is editable: comparing it
   * against the word "высшее" would let a capital letter or a typo silently change
   * the design. What is shown and what is decided on are different things.
   */
  hasHigherEducation: boolean;
  sortOrder: number;
  images: MemberImage[];
};

const COLUMNS =
  "id, organization_id, is_active, name, name_kk, name_ru, role_kk, role_ru, " +
  "education_kk, education_ru, specialty_kk, specialty_ru, level_kk, level_ru, " +
  "has_higher_education, sort_order, images";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** images is jsonb, so it arrives as parsed JSON of unknown shape. */
function toImages(value: unknown): MemberImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const url = (item as { url?: unknown }).url;
    if (typeof url !== "string") return [];
    const path = (item as { path?: unknown }).path;
    return [{ url, path: typeof path === "string" ? path : null }];
  });
}

function toRecord(row: Row): CultureMemberRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    isActive: row.is_active === true,
    // name is the non-null service column; it backs the localized ones so a person
    // entered in one language still has a name in the other.
    nameKk: str(row.name_kk) ?? str(row.name),
    nameRu: str(row.name_ru) ?? str(row.name),
    roleKk: str(row.role_kk),
    roleRu: str(row.role_ru),
    educationKk: str(row.education_kk),
    educationRu: str(row.education_ru),
    specialtyKk: str(row.specialty_kk),
    specialtyRu: str(row.specialty_ru),
    levelKk: str(row.level_kk),
    levelRu: str(row.level_ru),
    hasHigherEducation: row.has_higher_education === true,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    images: toImages(row.images),
  };
}

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedMember(
  record: CultureMemberRecord,
  locale: Locale,
  field: "name" | "role" | "education" | "specialty" | "level"
): string | null {
  const kk = record[`${field}Kk` as keyof CultureMemberRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureMemberRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/**
 * Every artist the caller may see, in the order the institution set.
 *
 * RLS decides the scope: an administrator gets their own institution's rows
 * including hidden ones, an anonymous visitor gets only the shown ones. A failed
 * query returns an empty list rather than throwing, so one bad request cannot take
 * down the page around it.
 */
export async function listCultureMembers(): Promise<CultureMemberRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_members")
    .select(COLUMNS)
    .order("sort_order")
    .order("name");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One artist by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureMemberById(id: string): Promise<CultureMemberRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_members").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * The artists this site's institution shows publicly.
 *
 * Scoped to the organization deliberately: the read policy publishes every shown
 * artist on the platform, so without this filter another institution's ensemble
 * would appear here the moment a second one joins. RLS keeps tenants out of each
 * other's private data; deciding whose artists this site lists is the
 * application's job.
 *
 * is_active is filtered here too, because RLS hides it only from anonymous
 * visitors — a signed-in administrator would otherwise see hidden artists on the
 * public page and think they were live.
 *
 * Memoized per request: the page and its metadata share one query.
 */
export const listPublicCultureMembers = cache(async (): Promise<CultureMemberRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_members")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
});
