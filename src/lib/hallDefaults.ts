import { createClient } from "@/lib/supabase/server";
import { STANDARD, categoryLabel } from "@/lib/seatCategories";

/**
 * Copies a hall's seat categories and default prices into one event.
 *
 * The hall sets them, the event owns its copy: after this the event's seats and prices are
 * changed on the event's own Билеты page, and editing the hall later does not reach back into
 * events already made.
 *
 * Seats: the event's category overrides are replaced by the hall's non-standard seats. They are
 * replaced rather than merged because overrides from a previous hall point at that hall's seats.
 *
 * Prices, per mode:
 * - "fill": a category the event has no ticket type for gets one at the hall's price; a price
 *   the event already set is kept. Used when a hall is first given to an event.
 * - "replace": the hall's price is written over the event's for every category the hall has a
 *   price for. Used by the explicit «Взять места и цены из зала» button.
 */
export async function applyHallDefaultsToEvent(
  eventId: string,
  hallId: string,
  mode: "fill" | "replace"
): Promise<{ ok: boolean; seats: number; prices: number }> {
  const supabase = await createClient();

  const [{ data: seats, error: seatsError }, { data: prices, error: pricesError }] = await Promise.all([
    supabase.from("hall_seats").select("id, category").eq("hall_id", hallId).neq("category", STANDARD),
    supabase.from("hall_category_prices").select("category, price").eq("hall_id", hallId),
  ]);
  if (seatsError) return { ok: false, seats: 0, prices: 0 };

  const { error: clearError } = await supabase.from("event_seat_categories").delete().eq("event_id", eventId);
  if (clearError) return { ok: false, seats: 0, prices: 0 };

  const overrides = (seats ?? []).map((seat) => ({ event_id: eventId, seat_id: seat.id as string, category: seat.category as string }));
  if (overrides.length > 0) {
    const { error } = await supabase.from("event_seat_categories").insert(overrides);
    if (error) return { ok: false, seats: 0, prices: 0 };
  }

  // Before the hall_category_prices migration there are no prices to copy; the seats still are.
  if (pricesError || !prices || prices.length === 0) return { ok: true, seats: overrides.length, prices: 0 };

  const ticketTypes = (prices as { category: string; price: number | string }[]).map((row) => {
    const price = Number(row.price);
    return {
      event_id: eventId,
      category: row.category,
      name_ru: categoryLabel(row.category, "ru"),
      name_kk: categoryLabel(row.category, "kk"),
      price,
      is_free: price === 0,
    };
  });

  if (mode === "fill") {
    const { error } = await supabase
      .from("event_ticket_types")
      .upsert(ticketTypes, { onConflict: "event_id,category", ignoreDuplicates: true });
    if (error) return { ok: false, seats: overrides.length, prices: 0 };
  } else {
    // Only the price changes on a type the event already has; its name and on/off stay the event's.
    const { data: existing } = await supabase.from("event_ticket_types").select("id, category").eq("event_id", eventId);
    const byCategory = new Map((existing ?? []).map((row) => [row.category as string, row.id as string]));
    for (const type of ticketTypes) {
      const id = byCategory.get(type.category);
      const { error } = id
        ? await supabase.from("event_ticket_types").update({ price: type.price, is_free: type.is_free }).eq("id", id)
        : await supabase.from("event_ticket_types").insert(type);
      if (error) return { ok: false, seats: overrides.length, prices: 0 };
    }
  }

  return { ok: true, seats: overrides.length, prices: ticketTypes.length };
}
