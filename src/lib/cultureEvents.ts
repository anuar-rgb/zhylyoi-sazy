import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import { EVENT_CATEGORIES, EVENT_STATUSES, type EventCategory, type EventStatus } from "@/lib/eventFields";
import { translateFieldPair } from "@/lib/autoTranslate";

export * from "@/lib/eventFields";

/** Same shape the other sections use: `path` is null for images outside our bucket. */
export type EventImage = { url: string; path: string | null };

export type CultureEventRecord = {
  id: string;
  organizationId: string;
  slug: string | null;
  status: EventStatus;
  titleKk: string | null;
  titleRu: string | null;
  descriptionKk: string | null;
  descriptionRu: string | null;
  fullTextKk: string | null;
  fullTextRu: string | null;
  locationKk: string | null;
  locationRu: string | null;
  /** ISO timestamps. The form works with local datetime strings and converts. */
  eventDate: string;
  endDate: string | null;
  categories: EventCategory[];
  organizerKk: string | null;
  organizerRu: string | null;
  ageLimit: string | null;
  images: EventImage[];
  /** The hall this event takes place in; null for one with no hall (no seats, no tickets). */
  hallId: string | null;
};

const COLUMNS =
  "id, organization_id, slug, status, title, title_kk, title_ru, " +
  "description_kk, description_ru, full_text_kk, full_text_ru, " +
  "location_kk, location_ru, event_date, end_date, categories, " +
  "organizer_kk, organizer_ru, age_limit, images, hall_id";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toImages(value: unknown): EventImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const url = (item as { url?: unknown }).url;
    if (typeof url !== "string") return [];
    const path = (item as { path?: unknown }).path;
    return [{ url, path: typeof path === "string" ? path : null }];
  });
}

/** Drops anything the poster page cannot filter by, so a stale value cannot reach the UI. */
function toCategories(value: unknown): EventCategory[] {
  if (!Array.isArray(value)) return [];
  return value.filter((c): c is EventCategory => EVENT_CATEGORIES.includes(c as EventCategory));
}

function toStatus(value: unknown): EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus) ? (value as EventStatus) : "draft";
}

function toRecord(row: Row): CultureEventRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    slug: str(row.slug),
    status: toStatus(row.status),
    // Not backed by the service `title` column here: that would make a title
    // typed in only one language look, to translateFieldPair below, as if both
    // were already filled — masking a gap instead of letting it be translated.
    titleKk: str(row.title_kk),
    titleRu: str(row.title_ru),
    descriptionKk: str(row.description_kk),
    descriptionRu: str(row.description_ru),
    fullTextKk: str(row.full_text_kk),
    fullTextRu: str(row.full_text_ru),
    locationKk: str(row.location_kk),
    locationRu: str(row.location_ru),
    eventDate: String(row.event_date),
    endDate: str(row.end_date),
    categories: toCategories(row.categories),
    organizerKk: str(row.organizer_kk),
    organizerRu: str(row.organizer_ru),
    ageLimit: str(row.age_limit),
    images: toImages(row.images),
    hallId: str(row.hall_id),
  };
}

/** Every kk/ru pair an event carries, for filling gaps on public pages. */
const LOCALIZED_FIELD_PAIRS: [kk: keyof CultureEventRecord & string, ru: keyof CultureEventRecord & string][] = [
  ["titleKk", "titleRu"],
  ["descriptionKk", "descriptionRu"],
  ["fullTextKk", "fullTextRu"],
  ["locationKk", "locationRu"],
  ["organizerKk", "organizerRu"],
];

async function fillPublicTranslations(records: CultureEventRecord[]): Promise<CultureEventRecord[]> {
  let filled = records;
  for (const [kk, ru] of LOCALIZED_FIELD_PAIRS) filled = await translateFieldPair(filled, kk, ru);
  return filled;
}

/**
 * Events the signed-in staff member may see, newest first.
 *
 * RLS decides the scope. A failed query returns an empty list rather than
 * throwing, so one bad request cannot take down the page around it.
 */
export async function listCultureEvents(): Promise<CultureEventRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_events")
    .select(COLUMNS)
    .order("event_date", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One event by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureEventById(id: string): Promise<CultureEventRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_events").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * Published events of this site's institution.
 *
 * Scoped to the organization deliberately: the read policy publishes every
 * published event on the platform, so without this filter another institution's
 * poster would appear here once a second one joins.
 */
export const listPublicCultureEvents = cache(async (): Promise<CultureEventRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_events")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("event_date", { ascending: true });

  if (error || !data) return [];
  return fillPublicTranslations((data as unknown as Row[]).map(toRecord));
});

/** One published event by its public address. */
export const getPublicCultureEventBySlug = cache(async (slug: string): Promise<CultureEventRecord | null> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_events")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  const [filled] = await fillPublicTranslations([toRecord(data as unknown as Row)]);
  return filled;
});
