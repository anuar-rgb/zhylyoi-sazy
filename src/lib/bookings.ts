import { createClient } from "@/lib/supabase/server";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type BookingItemView = {
  itemId: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  ticketTypeNameKk: string | null;
  ticketTypeNameRu: string | null;
  priceAtBooking: number;
  /** Text placeholder for the QR content that a later phase will render as an actual code. */
  ticketCode: string;
  releasedAt: string | null;
};

export type BookingView = {
  bookingId: string;
  status: BookingStatus;
  buyerName: string;
  buyerPhone: string;
  totalAmount: number;
  expiresAt: string | null;
  createdAt: string;
  items: BookingItemView[];
  organizationId: string;
};

type BookingByTokenRow = {
  booking_id: string;
  status: string;
  buyer_name: string;
  buyer_phone: string;
  total_amount: number | string;
  expires_at: string | null;
  created_at: string;
  item_id: string | null;
  seat_id: string | null;
  row_label: string | null;
  seat_number: number | null;
  category: string | null;
  ticket_type_name_kk: string | null;
  ticket_type_name_ru: string | null;
  price_at_booking: number | string | null;
  ticket_code: string | null;
  released_at: string | null;
  organization_id: string;
};

function toStatus(value: string): BookingStatus {
  return value === "confirmed" || value === "cancelled" || value === "expired" ? value : "pending";
}

/**
 * A guest's own booking, found only by its access_token — get_booking_by_token is
 * SECURITY DEFINER and is the sole way anon ever reads a row from bookings; a plain
 * RLS SELECT gives anon nothing here at all, on purpose.
 *
 * The function returns one flat row per seat (or a single row with null item
 * columns for a booking that somehow has none); this folds that back into one
 * booking with an items array.
 */
export async function getBookingByToken(token: string): Promise<BookingView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_by_token", { p_token: token });

  if (error || !data || data.length === 0) return null;

  const rows = data as BookingByTokenRow[];
  const first = rows[0];

  const items: BookingItemView[] = rows
    .filter((row): row is BookingByTokenRow & { item_id: string; seat_id: string; row_label: string; seat_number: number; ticket_code: string } =>
      row.item_id !== null && row.seat_id !== null && row.row_label !== null && row.seat_number !== null && row.ticket_code !== null
    )
    .map((row) => ({
      itemId: row.item_id,
      seatId: row.seat_id,
      rowLabel: row.row_label,
      seatNumber: row.seat_number,
      category: row.category ?? "",
      ticketTypeNameKk: row.ticket_type_name_kk,
      ticketTypeNameRu: row.ticket_type_name_ru,
      priceAtBooking: Number(row.price_at_booking) || 0,
      ticketCode: row.ticket_code,
      releasedAt: row.released_at,
    }));

  return {
    bookingId: first.booking_id,
    status: toStatus(first.status),
    buyerName: first.buyer_name,
    buyerPhone: first.buyer_phone,
    totalAmount: Number(first.total_amount) || 0,
    expiresAt: first.expires_at,
    createdAt: first.created_at,
    items,
    organizationId: first.organization_id,
  };
}

/**
 * Seat ids currently unavailable for an event — booked and not released.
 *
 * Reached only through get_taken_seats: anon has no SELECT on booking_items at
 * all (it carries ticket_code, the future QR secret), so the public seat map asks
 * this function for just the ids instead. Also sweeps this event's lapsed pending
 * holds first, so a seat whose 15 minutes just ran out shows free again right away
 * rather than only after the next booking attempt touches it.
 */
export async function getTakenSeatIds(eventId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_taken_seats", { p_event_id: eventId });

  if (error || !data) return new Set();
  return new Set((data as { seat_id: string }[]).map((row) => row.seat_id));
}
