import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import { toPublishStatus, type PublishStatus } from "@/lib/publishStatus";

/** Same shape the other sections use: `path` is null for images outside our bucket. */
export type NewsImage = { url: string; path: string | null };

export type CultureNewsRecord = {
  id: string;
  organizationId: string;
  slug: string | null;
  status: PublishStatus;
  titleKk: string | null;
  titleRu: string | null;
  tagKk: string | null;
  tagRu: string | null;
  excerptKk: string | null;
  excerptRu: string | null;
  contentKk: string | null;
  contentRu: string | null;
  /** ISO instant, or null while the piece is still a draft. */
  publishedAt: string | null;
  images: NewsImage[];
};

const COLUMNS =
  "id, organization_id, slug, status, title, title_kk, title_ru, " +
  "tag_kk, tag_ru, excerpt_kk, excerpt_ru, content_kk, content_ru, " +
  "published_at, images";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toImages(value: unknown): NewsImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const url = (item as { url?: unknown }).url;
    if (typeof url !== "string") return [];
    const path = (item as { path?: unknown }).path;
    return [{ url, path: typeof path === "string" ? path : null }];
  });
}

function toRecord(row: Row): CultureNewsRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    slug: str(row.slug),
    status: toPublishStatus(row.status),
    // title is the non-null service column; it backs the localized ones so the
    // UI never shows an empty heading.
    titleKk: str(row.title_kk) ?? str(row.title),
    titleRu: str(row.title_ru) ?? str(row.title),
    tagKk: str(row.tag_kk),
    tagRu: str(row.tag_ru),
    excerptKk: str(row.excerpt_kk),
    excerptRu: str(row.excerpt_ru),
    contentKk: str(row.content_kk),
    contentRu: str(row.content_ru),
    publishedAt: str(row.published_at),
    images: toImages(row.images),
  };
}

/**
 * News the signed-in staff member may see, newest first.
 *
 * RLS decides the scope. A failed query returns an empty list rather than
 * throwing, so one bad request cannot take down the page around it.
 */
export async function listCultureNews(): Promise<CultureNewsRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_news")
    .select(COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One item by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureNewsById(id: string): Promise<CultureNewsRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_news").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * Published news of this site's institution, newest first.
 *
 * Scoped to the organization deliberately: the read policy publishes every
 * published item on the platform, so without this filter another institution's
 * news would appear here once a second one joins.
 */
export const listPublicCultureNews = cache(async (): Promise<CultureNewsRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_news")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
});

/** One published item by its public address. */
export const getPublicCultureNewsBySlug = cache(async (slug: string): Promise<CultureNewsRecord | null> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_news")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
});
