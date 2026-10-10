import { createClient } from "@/lib/supabase/server";
import { STANDARD } from "@/lib/seatCategories";

/**
 * Copies a hall's seat categories into one event: which seats are VIP (or another category).
 *
 * The hall sets them, the event owns its copy: after this the event's seats are changed on the
 * event's own Билеты page, and editing the hall later does not reach back into events already
 * made. Prices are not the hall's — every event sets its own (see saveEventPrices).
 *
 * The event's category overrides are replaced by the hall's non-standard seats, not merged:
 * overrides from a previous hall point at that hall's seats.
 */
export async function applyHallSeatsToEvent(eventId: string, hallId: string): Promise<{ ok: boolean; seats: number }> {
  const supabase = await createClient();

  const { data: seats, error: seatsError } = await supabase
    .from("hall_seats")
    .select("id, category")
    .eq("hall_id", hallId)
    .neq("category", STANDARD);
  if (seatsError) return { ok: false, seats: 0 };

  const { error: clearError } = await supabase.from("event_seat_categories").delete().eq("event_id", eventId);
  if (clearError) return { ok: false, seats: 0 };

  const overrides = (seats ?? []).map((seat) => ({ event_id: eventId, seat_id: seat.id as string, category: seat.category as string }));
  if (overrides.length > 0) {
    const { error } = await supabase.from("event_seat_categories").insert(overrides);
    if (error) return { ok: false, seats: 0 };
  }

  return { ok: true, seats: overrides.length };
}
