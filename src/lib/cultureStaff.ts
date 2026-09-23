import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";
import type { Locale } from "@/i18n/routing";

/** Same shape as a club's image: `path` is null for anything outside our bucket. */
export type StaffImage = { url: string; path: string | null };

export type CultureStaffRecord = {
  id: string;
  organizationId: string;
  isActive: boolean;
  nameKk: string | null;
  nameRu: string | null;
  roleKk: string | null;
  roleRu: string | null;
  descriptionKk: string | null;
  descriptionRu: string | null;
  phone: string | null;
  email: string | null;
  sortOrder: number;
  images: StaffImage[];
};

const COLUMNS =
  "id, organization_id, is_active, name, name_kk, name_ru, role_kk, role_ru, " +
  "description_kk, description_ru, phone, email, sort_order, images";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** images is jsonb, so it arrives as parsed JSON of unknown shape. */
function toImages(value: unknown): StaffImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const url = (item as { url?: unknown }).url;
    if (typeof url !== "string") return [];
    const path = (item as { path?: unknown }).path;
    return [{ url, path: typeof path === "string" ? path : null }];
  });
}

function toRecord(row: Row): CultureStaffRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    isActive: row.is_active === true,
    // Not backed by the service `name` column here: that would make a name typed
    // in only one language look, to translateFieldPair below, as if both were
    // already filled — masking a gap instead of letting it be translated.
    nameKk: str(row.name_kk),
    nameRu: str(row.name_ru),
    roleKk: str(row.role_kk),
    roleRu: str(row.role_ru),
    descriptionKk: str(row.description_kk),
    descriptionRu: str(row.description_ru),
    phone: str(row.phone),
    email: str(row.email),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    images: toImages(row.images),
  };
}

/** Every kk/ru pair a staff member carries, for filling gaps on public pages. */
const LOCALIZED_FIELD_PAIRS: [kk: keyof CultureStaffRecord & string, ru: keyof CultureStaffRecord & string][] = [
  ["nameKk", "nameRu"],
  ["roleKk", "roleRu"],
  ["descriptionKk", "descriptionRu"],
];

async function fillPublicTranslations(records: CultureStaffRecord[]): Promise<CultureStaffRecord[]> {
  let filled = records;
  for (const [kk, ru] of LOCALIZED_FIELD_PAIRS) filled = await translateFieldPair(filled, kk, ru);
  return filled;
}

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedStaff(
  record: CultureStaffRecord,
  locale: Locale,
  field: "name" | "role" | "description"
): string | null {
  const kk = record[`${field}Kk` as keyof CultureStaffRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureStaffRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/**
 * Everyone the caller may see, in the order the institution set.
 *
 * RLS decides the scope: an administrator gets their own institution's rows
 * including hidden ones, an anonymous visitor gets only the shown ones. A failed
 * query returns an empty list rather than throwing, so one bad request cannot take
 * down the page around it.
 */
export async function listCultureStaff(): Promise<CultureStaffRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_staff")
    .select(COLUMNS)
    .order("sort_order")
    .order("name");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One person by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureStaffById(id: string): Promise<CultureStaffRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_staff").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * The people this site's institution shows publicly.
 *
 * Scoped to the organization deliberately: the read policy publishes every shown
 * person on the platform, so without this filter another institution's staff would
 * appear here the moment a second one joins. RLS keeps tenants out of each other's
 * private data; deciding whose staff this site lists is the application's job.
 *
 * is_active is filtered here too, because RLS hides it only from anonymous
 * visitors — a signed-in administrator would otherwise see hidden people on the
 * public page and think they were live.
 *
 * Memoized per request: the page and its metadata share one query.
 */
export const listPublicCultureStaff = cache(async (): Promise<CultureStaffRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_staff")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error || !data) return [];
  return fillPublicTranslations((data as unknown as Row[]).map(toRecord));
});
