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

type Row = Record<string, unknown>;

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
    .in("status", ["pending", "confirmed"]);

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
    .in("status", ["pending", "confirmed"]);

  if (error || !data) return counts;
  for (const row of data as { event_id: string }[]) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }
  return counts;
}

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
