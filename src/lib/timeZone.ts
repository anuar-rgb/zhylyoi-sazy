/**
 * The one time zone of the whole site: every date a person reads, and every date-time a form
 * stores, is in the institution's local time (Atyrau, UTC+5).
 *
 * Never format a date without it. The server on Railway runs on UTC, so a bare
 * toLocaleString() there reads five hours early; in the browser it would follow the visitor's
 * device instead. Kazakhstan has kept a single offset with no daylight saving since 2024, so the
 * fixed offset below is exact.
 *
 * Safe to import from client components: nothing here touches the server.
 */
export const INSTITUTION_TIME_ZONE = "Asia/Atyrau";
export const INSTITUTION_OFFSET = "+05:00";
export const INSTITUTION_OFFSET_MS = 5 * 60 * 60 * 1000;

type DateInput = string | number | Date;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "8 окт. 2026 г., 14:07" */
export function formatDateTime(value: DateInput, locale = "ru-RU"): string {
  const date = toDate(value);
  return date ? date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: INSTITUTION_TIME_ZONE }) : "—";
}

/** "8 окт. 2026 г." */
export function formatDate(value: DateInput, locale = "ru-RU"): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(locale, { dateStyle: "medium", timeZone: INSTITUTION_TIME_ZONE }) : "—";
}

/** "08.10.2026" */
export function formatDateNumeric(value: DateInput, locale = "ru-RU"): string {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: INSTITUTION_TIME_ZONE })
    : "—";
}

/** "14:07", or "14:07:32" with seconds. */
export function formatTime(value: DateInput, { seconds = false, locale = "ru-RU" } = {}): string {
  const date = toDate(value);
  return date
    ? date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        ...(seconds ? { second: "2-digit" as const } : {}),
        hour12: false,
        timeZone: INSTITUTION_TIME_ZONE,
      })
    : "—";
}

/** Today's calendar day at the institution, as "2026-10-08". */
export function institutionToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: INSTITUTION_TIME_ZONE });
}
