import { createClient } from "@/lib/supabase/server";
import { listHallSeats, listPublicHallSeats, type HallSeatRecord } from "@/lib/halls";

/**
 * This event's seat-category overrides, seat id -> category. A seat with no
 * entry here sells as "standard" for this event — never hall_seats.category,
 * which is only the hall's own base layout now (see the migration's comment).
 * RLS gates the read: staff of the event's organization get every row, an
 * anonymous caller only for a published event — the same query serves both
 * the admin editor and the public seat picker.
 */
export async function listEventSeatOverrides(eventId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_seat_categories")
    .select("seat_id, category")
    .eq("event_id", eventId);

  if (error || !data) return new Map();
  return new Map((data as { seat_id: string; category: string }[]).map((row) => [row.seat_id, row.category]));
}

/**
 * The categories this event actually sells: "standard" always (the default
 * every seat starts at), plus whatever this event marked as something else.
 * Used by the ticket-type form so staff can only price a category that some
 * seat of this event is actually set to.
 */
export async function listEventSeatCategories(eventId: string): Promise<string[]> {
  const overrides = await listEventSeatOverrides(eventId);
  const categories = new Set<string>(["standard"]);
  for (const category of overrides.values()) categories.add(category);
  return [...categories].sort();
}

/** A hall's seats with categories resolved for this event — the admin seat-category editor. */
export async function listEventSeatsForAdmin(eventId: string, hallId: string): Promise<HallSeatRecord[]> {
  const [seats, overrides] = await Promise.all([listHallSeats(hallId), listEventSeatOverrides(eventId)]);
  return seats.map((seat) => ({ ...seat, category: overrides.get(seat.id) ?? "standard" }));
}

/** A hall's active seats with categories resolved for this event — the public seat picker. */
export async function listPublicEventSeats(eventId: string, hallId: string): Promise<HallSeatRecord[]> {
  const [seats, overrides] = await Promise.all([listPublicHallSeats(hallId), listEventSeatOverrides(eventId)]);
  return seats.map((seat) => ({ ...seat, category: overrides.get(seat.id) ?? "standard" }));
}
