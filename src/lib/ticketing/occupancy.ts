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
    .select("seat_id, checked_in_at, price_at_booking, bookings!inner(status, public_order_id, buyer_name)")
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
      buyerName: booking.buyer_name ? String(booking.buyer_name) : null,
      paid: row.price_at_booking === null || row.price_at_booking === undefined ? null : Number(row.price_at_booking),
    });
  }
  return occupants;
}

/** One sold ticket, for the list under an event's hall map. */
export type SoldTicket = {
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  category: string | null;
  paid: number;
  enteredAt: string | null;
};

/**
 * Every ticket of an event's confirmed orders that still holds its seat (not refunded or
 * released), by order and then seat. Staff only: row-level security limits it to their institution.
 */
export async function listSoldTickets(eventId: string): Promise<SoldTicket[]> {
  const supabase = await createClient();
  const read = (seatColumns: string) =>
    supabase
      .from("booking_items")
      .select(
        `checked_in_at, price_at_booking, hall_seats(${seatColumns}), event_ticket_types(category), ` +
          "bookings!inner(status, public_order_id, buyer_name, buyer_phone)"
      )
      .eq("event_id", eventId)
      .eq("bookings.status", "confirmed")
      .is("released_at", null);

  let { data, error } = await read("row_label, seat_number, section");
  // Before the sections migration the column does not exist; every seat is the parter then.
  if (error?.code === "42703") ({ data, error } = await read("row_label, seat_number"));
  if (error || !data) return [];

  const one = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Row | null;
  return (data as unknown as Row[])
    .map((row) => {
      const booking = one(row.bookings);
      const seat = one(row.hall_seats);
      const type = one(row.event_ticket_types);
      return {
        orderNumber: booking?.public_order_id ? String(booking.public_order_id) : "—",
        buyerName: booking?.buyer_name ? String(booking.buyer_name) : "",
        buyerPhone: booking?.buyer_phone ? String(booking.buyer_phone) : "",
        section: seat?.section ? String(seat.section) : "parter",
        rowLabel: seat ? String(seat.row_label) : "",
        seatNumber: seat ? Number(seat.seat_number) : 0,
        category: type?.category ? String(type.category) : null,
        paid: Number(row.price_at_booking) || 0,
        enteredAt: row.checked_in_at ? String(row.checked_in_at) : null,
      };
    })
    .sort(
      (a, b) =>
        a.orderNumber.localeCompare(b.orderNumber) ||
        a.section.localeCompare(b.section) ||
        a.rowLabel.localeCompare(b.rowLabel, "ru", { numeric: true }) ||
        a.seatNumber - b.seatNumber
    );
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
