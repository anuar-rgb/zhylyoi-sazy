import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

/**
 * Where the recording actually lives.
 *
 * "youtube" is what the form creates. "file" belongs to the two recordings carried
 * over from the page file, whose .mp4s sit in the app itself; they have no YouTube
 * link, and dropping them for the sake of a tidier schema would have left the page
 * empty. Once the institution puts them on YouTube it deletes those rows and this
 * distinction stops mattering.
 */
export type VideoKind = "youtube" | "file";

export type CultureVideoRecord = {
  id: string;
  organizationId: string;
  isActive: boolean;
  titleKk: string | null;
  titleRu: string | null;
  descriptionKk: string | null;
  descriptionRu: string | null;
  venueKk: string | null;
  venueRu: string | null;
  kind: VideoKind;
  /** Eleven characters, not a link — the link's shape was resolved when it was saved. */
  youtubeId: string | null;
  filePath: string | null;
  sortOrder: number;
};

const COLUMNS =
  "id, organization_id, is_active, title, title_kk, title_ru, description_kk, description_ru, " +
  "venue_kk, venue_ru, kind, youtube_id, file_path, sort_order";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(row: Row): CultureVideoRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    isActive: row.is_active === true,
    // title is the non-null service column; it backs the localized ones.
    titleKk: str(row.title_kk) ?? str(row.title),
    titleRu: str(row.title_ru) ?? str(row.title),
    descriptionKk: str(row.description_kk),
    descriptionRu: str(row.description_ru),
    venueKk: str(row.venue_kk),
    venueRu: str(row.venue_ru),
    // Anything unexpected reads as a YouTube row with no id, which renders nothing
    // rather than reaching for a file path that is not there.
    kind: row.kind === "file" ? "file" : "youtube",
    youtubeId: str(row.youtube_id),
    filePath: str(row.file_path),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedVideo(
  record: CultureVideoRecord,
  locale: Locale,
  field: "title" | "description" | "venue"
): string | null {
  const kk = record[`${field}Kk` as keyof CultureVideoRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureVideoRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/** A row with nothing to play: a YouTube entry whose id is missing, or a file with no path. */
export function isPlayable(record: CultureVideoRecord): boolean {
  return record.kind === "file" ? record.filePath !== null : record.youtubeId !== null;
}

/**
 * Every recording the caller may see, in the order the institution set.
 *
 * RLS decides the scope: an administrator gets their own institution's rows
 * including hidden ones, an anonymous visitor gets only the shown ones.
 */
export async function listCultureVideos(): Promise<CultureVideoRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_videos")
    .select(COLUMNS)
    .order("sort_order")
    .order("title");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One recording by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureVideoById(id: string): Promise<CultureVideoRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_videos").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * The recordings this site's institution shows publicly.
 *
 * Scoped to the organization deliberately, and filtered on is_active here as well:
 * RLS hides inactive rows only from anonymous visitors, so a signed-in
 * administrator would otherwise see hidden recordings on the public page.
 *
 * Rows with nothing to play are dropped rather than rendered as an empty frame.
 */
export const listPublicCultureVideos = cache(async (): Promise<CultureVideoRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_videos")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order")
    .order("title");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord).filter(isPlayable);
});
