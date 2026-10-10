import { createClient } from "@/lib/supabase/server";
import { getTakenSeatIds } from "@/lib/bookings";

/** What is on a seat right now: sold, sold and already through the door, or held while unpaid. */
export type SeatOccupant = {
  state: "sold" | "entered" | "held";
  orderNumber: string | null;
  buyerName: string | null;
  /** What the ticket cost when bought — the seat's category may have been changed since. */
  paid: number | null;
};

type Row = Record<string, unknown>;

/**
 * Every taken seat of an event, seat id -> who has it. A seat whose ticket was released
 * (cancelled, expired, refunded) is free again and not here.
 *
 * Unpaid holds that ran out are swept first (get_taken_seats does that), so a seat whose
 * 15 minutes are over shows free here too, the same as on the public seat map.
 */
export async function listSeatOccupants(eventId: string): Promise<Map<string, SeatOccupant>> {
  await getTakenSeatIds(eventId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_items")
    .select("seat_id, checked_in_at, price_at_booking, bookings!inner(status, public_order_id, buyer_name)")
    .eq("event_id", eventId)
    .is("released_at", null);
  if (error || !data) return new Map();

  const occupants = new Map<string, SeatOccupant>();
  for (const row of data as unknown as Row[]) {
    const booking = (Array.isArray(row.bookings) ? row.bookings[0] : row.bookings) as Row | null;
    if (!booking || !row.seat_id) continue;
    const status = String(booking.status);
    if (status !== "confirmed" && status !== "pending") continue;
    occupants.set(String(row.seat_id), {
      state: status === "pending" ? "held" : row.checked_in_at ? "entered" : "sold",
      orderNumber: booking.public_order_id ? String(booking.public_order_id) : null,
      buyerName: booking.buyer_name ? String(booking.buyer_name) : null,
      paid: row.price_at_booking === null || row.price_at_booking === undefined ? null : Number(row.price_at_booking),
    });
  }
  return occupants;
}
