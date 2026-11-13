import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES } from "@/lib/bookingStatus";

/**
 * Active (pending or confirmed) bookings for one event — used to warn before
 * deleting it, since bookings.event_id cascades on delete and would take
 * every sale/ticket with it. Cancelled/expired holds don't count: they're
 * abandoned carts, not sales anyone would miss.
 */
export async function countActiveBookingsForEvent(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ACTIVE_STATUSES);

  return error || count === null ? 0 : count;
}

/** Same as countActiveBookingsForEvent, for a whole list at once — the "Билеты" dashboard's delete buttons. */
export async function countActiveBookingsForEvents(eventIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("event_id")
    .in("event_id", eventIds)
    .in("status", ACTIVE_STATUSES);

  if (error || !data) return counts;
  for (const row of data as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Events that ever handed out tickets: an order that was confirmed, paid or refunded (anything but
 * an abandoned or expired hold). Such an event is kept with its orders for TICKET_ARCHIVE_YEARS
 * (src/lib/eventArchive.ts); the database refuses to delete it before that.
 */
export async function listEventsWithTicketHistory(eventIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  if (eventIds.length === 0) return found;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("event_id")
    .in("event_id", eventIds)
    .not("status", "in", "(expired,cancelled)");
  if (error || !data) return found;
  for (const row of data as { event_id: string }[]) found.add(row.event_id);
  return found;
}

/** Orders of an event whose buyer holds tickets now (confirmed, or paid late): who a move or a cancellation is told to. */
export async function countTicketHolders(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["confirmed", "late_payment"]);
  return error || count === null ? 0 : count;
}
