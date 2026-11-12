import { INSTITUTION_OFFSET_MS } from "@/lib/timeZone";

/**
 * Rules for cancelling an event and for keeping its orders. Plain functions with no server imports,
 * so pages, client components and tests share them.
 *
 * The database enforces the same rules (migration 20261112120000_event_cancel_move_archive.sql):
 * cancel_event refuses after the event's day, and an event with tickets cannot be deleted while its
 * orders are kept.
 */

/**
 * Years an event's orders and tickets are kept after it ends: 5, as the bank's acquiring contract
 * requires (Halyk «Договор присоединения к интернет-эквайрингу», п. 7.3.4).
 */
export const TICKET_ARCHIVE_YEARS = 5;

type Dated = { eventDate: string; endDate: string | null };

/** Until when an event's orders are kept: TICKET_ARCHIVE_YEARS after it ends. */
export function ticketArchiveUntil(event: Dated): Date {
  const end = new Date(event.endDate ?? event.eventDate);
  const until = new Date(end);
  until.setUTCFullYear(end.getUTCFullYear() + TICKET_ARCHIVE_YEARS);
  return until;
}

/**
 * When an event that sold tickets may be deleted, or null when it may be deleted now (it never sold
 * any, or its orders are past their keeping period).
 */
export function deleteBlockedUntil(event: Dated, hasTicketHistory: boolean, now = Date.now()): Date | null {
  if (!hasTicketHistory) return null;
  const until = ticketArchiveUntil(event);
  return until.getTime() > now ? until : null;
}

/** The calendar day of a moment at the institution (YYYY-MM-DD). */
function institutionDay(time: number): string {
  return new Date(time + INSTITUTION_OFFSET_MS).toISOString().slice(0, 10);
}

/** An event can be cancelled until the end of its day: a concert stopped halfway is cancelled too. */
export function canCancelEvent(event: { eventDate: string; cancelledAt: string | null }, now = Date.now()): boolean {
  if (event.cancelledAt) return false;
  return institutionDay(now) <= institutionDay(new Date(event.eventDate).getTime());
}

/** An event can be moved only before it starts. */
export function canMoveEvent(event: { eventDate: string; cancelledAt: string | null }, now = Date.now()): boolean {
  return !event.cancelledAt && new Date(event.eventDate).getTime() > now;
}
