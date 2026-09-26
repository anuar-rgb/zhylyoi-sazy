import { createClient } from "@/lib/supabase/server";

export type PendingPaidBooking = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  totalAmount: number;
  expiresAt: string | null;
  createdAt: string;
  eventTitle: string;
};

export type ConfirmedBookingItem = {
  id: string;
  rowLabel: string;
  seatNumber: number;
  checkedInAt: string | null;
};

export type ConfirmedBooking = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  totalAmount: number;
  createdAt: string;
  eventTitle: string;
  items: ConfirmedBookingItem[];
};

type Row = Record<string, unknown>;

/**
 * Paid bookings still waiting on staff to confirm the payment — the admin
 * counterpart to /my-ticket's "оплатите и дождитесь подтверждения" message.
 * Scoped to the caller's organization by is_staff_of via bookings_staff_read;
 * total_amount > 0 excludes free bookings, which confirm themselves at creation.
 */
export async function listPendingPaidBookings(organizationId: string): Promise<PendingPaidBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, buyer_name, buyer_phone, total_amount, expires_at, created_at, culture_events(title_kk, title_ru)")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .gt("total_amount", 0)
    .order("created_at");

  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const event = row.culture_events as Row | null;
    const eventTitle = event ? String(event.title_ru ?? event.title_kk ?? "") : "";

    return {
      id: String(row.id),
      buyerName: String(row.buyer_name),
      buyerPhone: String(row.buyer_phone),
      totalAmount: Number(row.total_amount) || 0,
      expiresAt: (row.expires_at as string | null) ?? null,
      createdAt: String(row.created_at),
      eventTitle,
    };
  });
}

/**
 * Confirmed bookings with their still-active seats, for manual check-in
 * verification when the scanner isn't used (or a code won't read) — the
 * per-seat checked_in_at that /admin/tickets/scan sets via check_in_ticket.
 */
export async function listConfirmedBookings(organizationId: string): Promise<ConfirmedBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, buyer_name, buyer_phone, total_amount, created_at, culture_events(title_kk, title_ru), " +
        "booking_items(id, checked_in_at, released_at, hall_seats(row_label, seat_number))"
    )
    .eq("organization_id", organizationId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const event = row.culture_events as Row | null;
    const eventTitle = event ? String(event.title_ru ?? event.title_kk ?? "") : "";
    const items = ((row.booking_items as Row[]) ?? [])
      .filter((item) => item.released_at === null)
      .map((item) => {
        const seat = item.hall_seats as Row | null;
        return {
          id: String(item.id),
          rowLabel: seat ? String(seat.row_label) : "",
          seatNumber: seat ? Number(seat.seat_number) : 0,
          checkedInAt: (item.checked_in_at as string | null) ?? null,
        };
      });

    return {
      id: String(row.id),
      buyerName: String(row.buyer_name),
      buyerPhone: String(row.buyer_phone),
      totalAmount: Number(row.total_amount) || 0,
      createdAt: String(row.created_at),
      eventTitle,
      items,
    };
  });
}
