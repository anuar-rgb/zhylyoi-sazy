import { createAdminClient } from "@/lib/supabase/admin";
import { adapters } from "./registry";

const MAX_BODY_BYTES = 100_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

/**
 * The shared part of every bank notification.
 *
 * The URL carries the payment method's id, so a request is tied to one institution's keys. The
 * adapter proves the bank sent it; this function then decides whether the booking may be settled:
 * it must be waiting for payment, belong to the same institution, be for exactly the amount paid,
 * and not be past its hold. Anything else is journaled as rejected for staff to deal with by hand,
 * never confirmed on a guess.
 */
export async function handlePaymentWebhook(methodId: string, request: Request): Promise<Response> {
  if (!UUID.test(methodId)) return json(404, { error: "not_found" });

  const admin = createAdminClient();
  if (!admin) return json(503, { error: "payments_not_configured" });

  const { data: method } = await admin
    .from("organization_payment_methods")
    .select("id, organization_id, provider_code, is_enabled")
    .eq("id", methodId)
    .maybeSingle();
  if (!method || !method.is_enabled) return json(404, { error: "not_found" });

  const adapter = adapters[method.provider_code as string];
  if (!adapter) return json(501, { error: "integration_not_available" });

  const { data: keys } = await admin
    .from("organization_payment_secrets")
    .select("merchant_id, secret_key")
    .eq("organization_payment_method_id", method.id)
    .maybeSingle();
  if (!keys?.secret_key) return json(409, { error: "keys_not_set" });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  const parsed = await adapter.parse({
    headers: request.headers,
    rawBody,
    secrets: { merchantId: (keys.merchant_id as string | null) ?? null, secretKey: keys.secret_key as string },
  });
  if (!parsed.ok) return json(parsed.status, { error: parsed.reason });

  const payment = parsed.payment;
  const organizationId = method.organization_id as string;
  const provider = method.provider_code as string;

  const journal = async (
    status: "confirmed" | "rejected" | "ignored",
    reason: string | null,
    bookingId: string | null
  ) => {
    // The unique index makes a repeated delivery a no-op instead of a second row.
    await admin.from("payment_events").upsert(
      {
        organization_id: organizationId,
        payment_method_id: method.id,
        provider_code: provider,
        external_id: payment.externalId,
        booking_id: bookingId,
        amount: payment.amount,
        status,
        reason,
        raw: payment.raw ?? null,
      },
      { onConflict: "organization_id,provider_code,external_id", ignoreDuplicates: true }
    );
  };

  // Seen before: the bank is retrying. Answer as we did the first time and change nothing.
  const { data: seen } = await admin
    .from("payment_events")
    .select("status, reason")
    .eq("organization_id", organizationId)
    .eq("provider_code", provider)
    .eq("external_id", payment.externalId)
    .maybeSingle();
  if (seen) {
    return adapter.reply({ ok: seen.status !== "rejected", reason: (seen.reason as string | null) ?? undefined });
  }

  if (!payment.paid) {
    await journal("ignored", "not_paid", UUID.test(payment.bookingId) ? payment.bookingId : null);
    return adapter.reply({ ok: true });
  }
  if (!UUID.test(payment.bookingId)) {
    await journal("rejected", "unknown_booking", null);
    return adapter.reply({ ok: false, reason: "unknown_booking" });
  }

  // One conditional update: it settles the booking only if every condition still holds at this
  // instant, so two notifications racing each other cannot both succeed.
  const { data: settled } = await admin
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: null })
    .eq("id", payment.bookingId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .eq("total_amount", payment.amount)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .select("id");

  if (settled && settled.length > 0) {
    await journal("confirmed", null, payment.bookingId);
    return adapter.reply({ ok: true });
  }

  // Not settled: work out why, so staff see a reason and not just a failure.
  const { data: booking } = await admin
    .from("bookings")
    .select("status, total_amount, organization_id")
    .eq("id", payment.bookingId)
    .maybeSingle();

  let reason = "unknown_booking";
  if (booking && booking.organization_id === organizationId) {
    if (booking.status === "confirmed") reason = "already_confirmed";
    else if (booking.status !== "pending") reason = `booking_${booking.status}`;
    else if (Number(booking.total_amount) !== payment.amount) reason = "amount_mismatch";
    else reason = "hold_expired";
  }

  // Already confirmed by hand moments earlier is not a failure for the bank.
  const harmless = reason === "already_confirmed";
  await journal(harmless ? "ignored" : "rejected", reason, booking ? payment.bookingId : null);
  return adapter.reply({ ok: harmless, reason });
}
