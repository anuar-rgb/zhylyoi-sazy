import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What the return pages are allowed to know about an order: its real status as the server holds
 * it. Never anything the browser claims, and nothing secret or personal.
 */
export type OrderStatus = "PENDING" | "PAID" | "FREE" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type PaymentState = "none" | "pending" | "processing" | "success" | "failed" | "cancelled" | "refunded";

export type OrderSnapshot = {
  orderNumber: string;
  status: OrderStatus;
  payment: PaymentState;
  amount: number;
  currency: string;
  /** Seconds until the hold on the seats ends; null once the order is settled or closed. */
  secondsLeft: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function orderStatusOf(bookingStatus: string, totalAmount: number): OrderStatus {
  switch (bookingStatus) {
    case "confirmed":
      return totalAmount > 0 ? "PAID" : "FREE";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "refunded":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

export async function getOrderSnapshot(accessToken: string, now = new Date()): Promise<OrderSnapshot | null> {
  if (!UUID.test(accessToken)) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: booking } = await admin
    .from("bookings")
    .select("id, public_order_id, status, total_amount, currency, expires_at")
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!booking) return null;

  const { data: latest } = await admin
    .from("payments")
    .select("status")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const amount = Number(booking.total_amount);
  const status = orderStatusOf(String(booking.status), amount);
  const expires = booking.expires_at ? new Date(String(booking.expires_at)).getTime() : null;

  return {
    orderNumber: String(booking.public_order_id),
    status,
    payment: (latest?.status as PaymentState | undefined) ?? "none",
    amount,
    currency: String(booking.currency ?? "KZT"),
    secondsLeft:
      status === "PENDING" && expires !== null ? Math.max(0, Math.round((expires - now.getTime()) / 1000)) : null,
  };
}
