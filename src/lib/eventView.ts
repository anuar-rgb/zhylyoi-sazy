import type { Locale } from "@/i18n/routing";
import type { CultureEventRecord } from "@/lib/cultureEvents";
import { INSTITUTION_TIME_ZONE, localizedEvent, paragraphs, type EventCategory } from "@/lib/eventFields";

/**
 * An event shaped for display.
 *
 * The stored record keeps one instant per event; the poster needs a date label, a
 * time, and a plain calendar day to filter on. Deriving all three here means the
 * components stay the same as when the data came from a file, and the client-side
 * filter can keep working on a plain object with no dates in it.
 *
 * This module has no server imports on purpose: the filter is a client component.
 */
export type EventView = {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  location: string;
  organizer: string;
  fullText: string[];
  /** "2026-09-20" in the institution's zone, for the date filter. */
  isoDate: string;
  /** "20 қыркүйек" / "20 сентября". */
  date: string;
  /** "19:00". */
  time: string;
  categories: EventCategory[];
  image: string | null;
  images: string[];
  /** Instants, for the calendar file. */
  startsAt: string;
  endsAt: string | null;
};

const LOCALE_TAG: Record<Locale, string> = { kk: "kk-KZ", ru: "ru-RU" };

/** The calendar day in the institution's zone, not the server's. */
function isoDayIn(zone: string, instant: Date): string {
  // en-CA renders as YYYY-MM-DD, which is exactly the shape the filter compares.
  return instant.toLocaleDateString("en-CA", { timeZone: zone });
}

export function toEventView(record: CultureEventRecord, locale: Locale): EventView {
  const starts = new Date(record.eventDate);
  const tag = LOCALE_TAG[locale];

  return {
    id: record.id,
    slug: record.slug,
    title: localizedEvent(record, locale, "title") ?? "",
    description: localizedEvent(record, locale, "description") ?? "",
    location: localizedEvent(record, locale, "location") ?? "",
    organizer: localizedEvent(record, locale, "organizer") ?? "",
    fullText: paragraphs(localizedEvent(record, locale, "fullText")),
    isoDate: isoDayIn(INSTITUTION_TIME_ZONE, starts),
    date: starts.toLocaleDateString(tag, {
      day: "numeric",
      month: "long",
      timeZone: INSTITUTION_TIME_ZONE,
    }),
    time: starts.toLocaleTimeString(tag, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: INSTITUTION_TIME_ZONE,
    }),
    categories: record.categories,
    image: record.images[0]?.url ?? null,
    images: record.images.map((i) => i.url),
    startsAt: record.eventDate,
    endsAt: record.endDate,
  };
}

export type DateBucket = "all" | "today" | "week" | "month";

/**
 * Whether an event falls in the chosen range.
 *
 * Compares calendar days as strings rather than as Date objects: the event's day is
 * already fixed in the institution's zone, and the viewer's browser may be in
 * another one, where midnight falls elsewhere.
 */
export function matchesDateBucket(isoDate: string, bucket: DateBucket, now: Date): boolean {
  if (bucket === "all") return true;

  const today = isoDayIn(INSTITUTION_TIME_ZONE, now);
  if (bucket === "today") return isoDate === today;

  if (bucket === "week") {
    const in7Days = isoDayIn(INSTITUTION_TIME_ZONE, new Date(now.getTime() + 7 * 24 * 3600 * 1000));
    return isoDate >= today && isoDate <= in7Days;
  }

  // Same calendar month as today.
  return isoDate.slice(0, 7) === today.slice(0, 7);
}

/**
 * A calendar file the browser can download without a round trip.
 *
 * Times are emitted in UTC (the trailing Z), which every calendar application
 * converts back to the reader's own zone.
 */
export function buildIcsDataUri(event: EventView): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s: string) => s.replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

  const endsAt = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 3600 * 1000).toISOString();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keng Zhylyoi//Afisha//KK",
    "BEGIN:VEVENT",
    `UID:${event.slug ?? event.id}@culture-portal-kz`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
