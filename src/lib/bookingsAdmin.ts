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
