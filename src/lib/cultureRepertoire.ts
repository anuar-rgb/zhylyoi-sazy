import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrganizationId } from "@/lib/organization";
import { asRepertoireCategory, type RepertoireCategory } from "@/lib/repertoireFields";
import { translateFieldPair } from "@/lib/autoTranslate";
import type { Locale } from "@/i18n/routing";

export type CultureRepertoireRecord = {
  id: string;
  organizationId: string;
  isActive: boolean;
  titleKk: string | null;
  titleRu: string | null;
  authorKk: string | null;
  authorRu: string | null;
  noteKk: string | null;
  noteRu: string | null;
  /** A stored value outside the known list reads as "other" rather than breaking the page. */
  category: RepertoireCategory;
  sortOrder: number;
};

const COLUMNS =
  "id, organization_id, is_active, title, title_kk, title_ru, author_kk, author_ru, " +
  "note_kk, note_ru, category, sort_order";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(row: Row): CultureRepertoireRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    isActive: row.is_active === true,
    // Not backed by the service `title` column here: that would make a title typed
    // in only one language look, to translateFieldPair below, as if both were
    // already filled — masking a gap instead of letting it be translated.
    titleKk: str(row.title_kk),
    titleRu: str(row.title_ru),
    authorKk: str(row.author_kk),
    authorRu: str(row.author_ru),
    noteKk: str(row.note_kk),
    noteRu: str(row.note_ru),
    category: asRepertoireCategory(str(row.category)),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

/** Every kk/ru pair a piece carries, for filling gaps on public pages. */
const LOCALIZED_FIELD_PAIRS: [kk: keyof CultureRepertoireRecord & string, ru: keyof CultureRepertoireRecord & string][] = [
  ["titleKk", "titleRu"],
  ["authorKk", "authorRu"],
  ["noteKk", "noteRu"],
];

async function fillPublicTranslations(records: CultureRepertoireRecord[]): Promise<CultureRepertoireRecord[]> {
  let filled = records;
  for (const [kk, ru] of LOCALIZED_FIELD_PAIRS) filled = await translateFieldPair(filled, kk, ru);
  return filled;
}

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedPiece(
  record: CultureRepertoireRecord,
  locale: Locale,
  field: "title" | "author" | "note"
): string | null {
  const kk = record[`${field}Kk` as keyof CultureRepertoireRecord] as string | null;
  const ru = record[`${field}Ru` as keyof CultureRepertoireRecord] as string | null;
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

/**
 * Every piece the caller may see, in the order the institution set.
 *
 * RLS decides the scope: an administrator gets their own institution's rows
 * including hidden ones, an anonymous visitor gets only the shown ones. A failed
 * query returns an empty list rather than throwing.
 */
export async function listCultureRepertoire(): Promise<CultureRepertoireRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_repertoire")
    .select(COLUMNS)
    .order("sort_order")
    .order("title");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/** One piece by id, for the edit form. Null when missing or not visible to the caller. */
export async function getCultureRepertoireById(id: string): Promise<CultureRepertoireRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("culture_repertoire").select(COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toRecord(data as unknown as Row);
}

/**
 * The pieces this site's institution shows publicly.
 *
 * Scoped to the organization deliberately: the read policy publishes every shown
 * piece on the platform, so without this filter another institution's repertoire
 * would appear here the moment a second one joins.
 *
 * is_active is filtered here too, because RLS hides it only from anonymous
 * visitors — a signed-in administrator would otherwise see hidden pieces on the
 * public page and think they were live.
 */
export const listPublicCultureRepertoire = cache(async (): Promise<CultureRepertoireRecord[]> => {
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("culture_repertoire")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order")
    .order("title");

  if (error || !data) return [];
  return fillPublicTranslations((data as unknown as Row[]).map(toRecord));
});
