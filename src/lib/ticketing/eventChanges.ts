import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { livePipeline } from "@/lib/payments/deps";
import { refundPayment } from "@/lib/payments/pipeline";
import { sendEventNotice } from "@/lib/mail/eventNotice";

/**
 * What follows a cancelled or moved event, done by the server's key after staff pressed the
 * button (cancel_event / move_event already checked who they are) and again by the payment
 * reconciliation every few minutes, so nothing is left half done when the bank or the mail server
 * did not answer.
 *
 * Cancelled: every paid order goes back through the bank in full, one order at a time; then every
 * buyer whose order is refunded by the cancellation is told. Moved: every buyer of a standing order
 * gets the tickets again with the new date. Both are safe to repeat.
 */
export type CancellationResult = {
  /** Paid orders the bank returned now. */
  refunded: number;
  /** Paid orders still holding money: the bank refused, or no bank is set up. */
  notRefunded: string[];
  emailed: number;
  emailFailed: number;
};

const PAID_STATUSES = ["confirmed", "late_payment"];

export async function settleCancelledEvent(eventId: string): Promise<CancellationResult> {
  const result: CancellationResult = { refunded: 0, notRefunded: [], emailed: 0, emailFailed: 0 };
  const admin = createAdminClient();
  if (!admin) return result;

  const { data: event } = await admin.from("culture_events").select("cancelled_at").eq("id", eventId).maybeSingle();
  if (!event?.cancelled_at) return result;

  const { data: paid } = await admin
    .from("bookings")
    .select("id, public_order_id")
    .eq("event_id", eventId)
    .in("status", PAID_STATUSES)
    .gt("total_amount", 0);

  if (paid && paid.length > 0) {
    let deps: ReturnType<typeof livePipeline> | null = null;
    try {
      deps = livePipeline();
    } catch {
      deps = null;
    }
    for (const booking of paid) {
      const order = String(booking.public_order_id);
      const payments = deps ? await deps.store.listRefundablePayments(String(booking.id)) : [];
      if (!deps || payments.length === 0) {
        result.notRefunded.push(order);
        continue;
      }
      let ok = true;
      for (const payment of payments) {
        const outcome = await refundPayment(deps, payment);
        if (!outcome.ok) ok = false;
      }
      if (ok) result.refunded++;
      else result.notRefunded.push(order);
    }
  }

  // Told after the money: orders this cancellation closed. One refunded by the cashier earlier is
  // left alone; the buyer already knows.
  const since = new Date(new Date(String(event.cancelled_at)).getTime() - 60_000).toISOString();
  const { data: closed } = await admin
    .from("bookings")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "refunded")
    .gte("refunded_at", since);
  for (const booking of closed ?? []) {
    const outcome = await sendEventNotice(String(booking.id), "cancelled");
    if (outcome === "sent") result.emailed++;
    else if (outcome === "failed") result.emailFailed++;
  }
  return result;
}

/** Sends every standing order of a moved event its tickets with the new date. */
export async function notifyMovedEvent(eventId: string): Promise<{ emailed: number; emailFailed: number }> {
  const result = { emailed: 0, emailFailed: 0 };
  const admin = createAdminClient();
  if (!admin) return result;
  const { data: bookings } = await admin.from("bookings").select("id").eq("event_id", eventId).eq("status", "confirmed");
  for (const booking of bookings ?? []) {
    const outcome = await sendEventNotice(String(booking.id), "moved");
    if (outcome === "sent") result.emailed++;
    else if (outcome === "failed") result.emailFailed++;
  }
  return result;
}

/** For the reconciliation: events cancelled in the last 30 days, and moved events still to come. */
export async function settleRecentEventChanges(): Promise<{ cancelled: number; moved: number }> {
  const admin = createAdminClient();
  if (!admin) return { cancelled: 0, moved: 0 };
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: cancelled }, { data: moved }] = await Promise.all([
    admin.from("culture_events").select("id").gte("cancelled_at", since),
    admin
      .from("culture_events")
      .select("id")
      .not("moved_from", "is", null)
      .is("cancelled_at", null)
      .gte("event_date", new Date().toISOString()),
  ]);
  for (const event of cancelled ?? []) await settleCancelledEvent(String(event.id));
  for (const event of moved ?? []) await notifyMovedEvent(String(event.id));
  return { cancelled: cancelled?.length ?? 0, moved: moved?.length ?? 0 };
}
