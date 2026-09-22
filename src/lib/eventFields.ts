/**
 * Field vocabulary and time handling for events.
 *
 * Kept apart from `cultureEvents.ts` on purpose: that module imports the Supabase
 * server client, and the admin form is a client component. Importing the constants
 * from there would drag server-only code into the browser bundle.
 */

/** The categories the public poster page filters by. */
export const EVENT_CATEGORIES = ["concert", "performance", "exhibition", "competition", "children"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  concert: "Концерты",
  performance: "Спектакли",
  exhibition: "Выставки",
  competition: "Конкурсы",
  children: "Для детей",
};

export const EVENT_STATUSES = ["draft", "pending", "published", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Черновик",
  pending: "На проверке",
  published: "Опубликовано",
  archived: "В архиве",
};

/**
 * The institution's time zone, Asia/Aqtau, as a fixed offset.
 *
 * Kazakhstan has observed a single offset since 2024 and does not use daylight
 * saving, so a fixed value is accurate here and keeps the conversion pure — no
 * dependence on the server's own zone, which on Railway is UTC.
 */
export const INSTITUTION_OFFSET = "+05:00";
export const INSTITUTION_TIME_ZONE = "Asia/Aqtau";
const INSTITUTION_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Turns what `<input type="datetime-local">` submits into a stored instant.
 *
 * The input gives "2026-10-05T19:00" with no zone. Read in the server's zone it
 * would mean a different moment than the poster says, so the institution's offset
 * is attached explicitly. Returns null for anything unparseable.
 */
export function dateTimeInputToIso(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}:00${INSTITUTION_OFFSET}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** The reverse: a stored instant as the local value the input expects. */
export function isoToDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed + INSTITUTION_OFFSET_MS).toISOString().slice(0, 16);
}

/** Human-readable date and time in the institution's zone, for lists and cards. */
export function formatEventDateTime(iso: string | null): string {
  if (!iso) return "—";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: INSTITUTION_TIME_ZONE,
  });
}

/**
 * The shape localizedEvent reads: a record carrying `<field>Kk` and `<field>Ru`.
 *
 * Declared structurally rather than by importing the record type, so this module
 * keeps no link to the server-only data layer and stays safe in the browser.
 */
type LocalizedEventFields = Record<string, unknown>;

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
export function localizedEvent(
  record: LocalizedEventFields,
  locale: "kk" | "ru",
  field: "title" | "description" | "fullText" | "location" | "organizer"
): string | null {
  const kk = record[`${field}Kk`];
  const ru = record[`${field}Ru`];
  const pick = locale === "kk" ? (kk ?? ru) : (ru ?? kk);
  return typeof pick === "string" && pick.length > 0 ? pick : null;
}

/** Splits stored long text into paragraphs on blank lines. */
export function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

