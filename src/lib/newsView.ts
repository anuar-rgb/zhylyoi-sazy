import type { Locale } from "@/i18n/routing";
import type { CultureNewsRecord } from "@/lib/cultureNews";
import { INSTITUTION_TIME_ZONE, localizedEvent, paragraphs } from "@/lib/eventFields";

/**
 * A news item shaped for display.
 *
 * The stored record keeps an instant; the page shows «15 тамыз» / «15 августа».
 * Deriving that here, in the institution's zone rather than the server's, keeps the
 * components as they were when the data came from a file.
 *
 * localizedEvent is reused on purpose: it reads `<field>Kk` / `<field>Ru` off any
 * record, and news carries the same field naming.
 */
export type NewsView = {
  id: string;
  slug: string | null;
  title: string;
  tag: string;
  excerpt: string;
  /** "15 тамыз" / "15 августа", empty while unpublished. */
  date: string;
  fullText: string[];
  images: string[];
};

const LOCALE_TAG: Record<Locale, string> = { kk: "kk-KZ", ru: "ru-RU" };

export function toNewsView(record: CultureNewsRecord, locale: Locale): NewsView {
  const published = record.publishedAt ? new Date(record.publishedAt) : null;

  return {
    id: record.id,
    slug: record.slug,
    title: localizedEvent(record, locale, "title") ?? "",
    tag: localizedEvent(record, locale, "tag") ?? "",
    excerpt: localizedEvent(record, locale, "excerpt") ?? "",
    date: published
      ? published.toLocaleDateString(LOCALE_TAG[locale], {
          day: "numeric",
          month: "long",
          timeZone: INSTITUTION_TIME_ZONE,
        })
      : "",
    fullText: paragraphs(localizedEvent(record, locale, "content")),
    images: record.images.map((image) => image.url),
  };
}
