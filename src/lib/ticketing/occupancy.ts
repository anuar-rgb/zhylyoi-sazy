import { createClient } from "@/lib/supabase/server";
import { getTakenSeatIds } from "@/lib/bookings";
import { isHold } from "@/lib/bookingStatus";

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
    .select("seat_id, checked_in_at, price_at_booking, bookings!inner(status, public_order_id, buyer_name, buyer_email)")
    .eq("event_id", eventId)
    .is("released_at", null);
  if (error || !data) return new Map();

  const occupants = new Map<string, SeatOccupant>();
  for (const row of data as unknown as Row[]) {
    const booking = (Array.isArray(row.bookings) ? row.bookings[0] : row.bookings) as Row | null;
    if (!booking || !row.seat_id) continue;
    const status = String(booking.status);
    if (status !== "confirmed" && !isHold(status)) continue;
    occupants.set(String(row.seat_id), {
      state: isHold(status) ? "held" : row.checked_in_at ? "entered" : "sold",
      orderNumber: booking.public_order_id ? String(booking.public_order_id) : null,
      // Orders now carry an email only; earlier ones a name.
      buyerName: booking.buyer_email ? String(booking.buyer_email) : booking.buyer_name ? String(booking.buyer_name) : null,
      paid: row.price_at_booking === null || row.price_at_booking === undefined ? null : Number(row.price_at_booking),
    });
  }
  return occupants;
}

/** A seat closed from sale for one event: kept for a guest, or out of order. */
export type SeatBlock = { kind: "reserved" | "broken"; note: string | null };

/**
 * The seats closed for this event, seat id -> why. Empty when there are none, or when the
 * event_seat_blocks migration has not been run yet (the table is missing): nothing is closed then.
 */
export async function listSeatBlocks(eventId: string): Promise<Map<string, SeatBlock>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("event_seat_blocks").select("seat_id, kind, note").eq("event_id", eventId);
  if (error || !data) return new Map();
  return new Map(
    (data as Row[]).map((row) => [
      String(row.seat_id),
      { kind: row.kind === "broken" ? "broken" : "reserved", note: row.note ? String(row.note) : null } satisfies SeatBlock,
    ])
  );
}
