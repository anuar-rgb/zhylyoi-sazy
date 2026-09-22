import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";
import { EVENT_CATEGORIES, EVENT_STATUSES, type EventCategory, type EventStatus } from "@/lib/eventFields";

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
  organizer: string | null;
  ageLimit: string | null;
  images: EventImage[];
};

const COLUMNS =
  "id, organization_id, slug, status, title, title_kk, title_ru, " +
  "description_kk, description_ru, full_text_kk, full_text_ru, " +
  "location_kk, location_ru, event_date, end_date, categories, " +
  "organizer, age_limit, images";

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
    // title is the non-null service column; it backs the localized ones so the
    // UI never shows an empty heading.
    titleKk: str(row.title_kk) ?? str(row.title),
    titleRu: str(row.title_ru) ?? str(row.title),
    descriptionKk: str(row.description_kk),
    descriptionRu: str(row.description_ru),
    fullTextKk: str(row.full_text_kk),
    fullTextRu: str(row.full_text_ru),
    locationKk: str(row.location_kk),
    locationRu: str(row.location_ru),
    eventDate: String(row.event_date),
    endDate: str(row.end_date),
    categories: toCategories(row.categories),
    organizer: str(row.organizer),
    ageLimit: str(row.age_limit),
    images: toImages(row.images),
  };
}

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedEvent(
  record: CultureEventRecord,
  locale: Locale,
  field: "title" | "description" | "fullText" | "location"
): string | null {
  const kk = record[`${field}Kk` as keyof CultureEventRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureEventRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/** Splits stored long text into paragraphs on blank lines. */
export function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
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
  return (data as unknown as Row[]).map(toRecord);
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
  return toRecord(data as unknown as Row);
});
