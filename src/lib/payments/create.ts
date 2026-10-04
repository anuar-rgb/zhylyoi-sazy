import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "./registry";

/**
 * Starts a payment for a booking: validates, records it as PENDING, asks the provider to create it
 * and returns where to send the buyer.
 *
 * Nothing here marks anything paid. The payment row stays PENDING until the provider's own word
 * arrives through the webhook pipeline (or reconciliation).
 */
export type CreateOutcome =
  | { ok: true; redirectUrl: string; paymentId: string }
  | { ok: false; error: "not_found" | "not_payable" | "method_unavailable" | "provider_unavailable" | "failed" };

export type BookingFacts = {
  status: string;
  totalAmount: number;
  expiresAt: string | null;
  organizationId: string;
  eventPaymentMethodId: string | null;
};

export type MethodFacts = {
  organizationId: string;
  isEnabled: boolean;
  mode: string;
  providerCode: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The rules for whether this booking may be paid with this method right now. Pure, so it is tested. */
export function checkPayable(
  booking: BookingFacts,
  method: MethodFacts,
  methodId: string,
  now: Date
): Exclude<CreateOutcome, { ok: true }>["error"] | null {
  if (booking.status !== "pending") return "not_payable";
  if (!(booking.totalAmount > 0)) return "not_payable";
  if (booking.expiresAt && new Date(booking.expiresAt).getTime() <= now.getTime()) return "not_payable";

  // Another institution's method, a switched-off one, one that is not set to pay through a bank,
  // or one the event has not chosen: all the same answer, with nothing said about why.
  if (method.organizationId !== booking.organizationId) return "method_unavailable";
  if (!method.isEnabled || method.mode !== "api") return "method_unavailable";
  if (booking.eventPaymentMethodId && booking.eventPaymentMethodId !== methodId) return "method_unavailable";
  return null;
}

export async function createPaymentForBooking(input: {
  accessToken: string;
  methodId: string;
  origin: string;
  now?: Date;
}): Promise<CreateOutcome> {
  if (!UUID.test(input.accessToken) || !UUID.test(input.methodId)) return { ok: false, error: "not_found" };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "failed" };

  const { data: booking } = await admin
    .from("bookings")
    .select("id, organization_id, public_order_id, status, total_amount, currency, expires_at, event_id")
    .eq("access_token", input.accessToken)
    .maybeSingle();
  if (!booking) return { ok: false, error: "not_found" };

  const { data: event } = await admin
    .from("culture_events")
    .select("title_ru, title_kk, payment_method_id")
    .eq("id", booking.event_id)
    .maybeSingle();

  const { data: method } = await admin
    .from("organization_payment_methods")
    .select("id, organization_id, provider_code, is_enabled, mode")
    .eq("id", input.methodId)
    .maybeSingle();
  if (!method) return { ok: false, error: "method_unavailable" };

  const refusal = checkPayable(
    {
      status: String(booking.status),
      totalAmount: Number(booking.total_amount),
      expiresAt: (booking.expires_at as string | null) ?? null,
      organizationId: String(booking.organization_id),
      eventPaymentMethodId: (event?.payment_method_id as string | null) ?? null,
    },
    {
      organizationId: String(method.organization_id),
      isEnabled: method.is_enabled === true,
      mode: String(method.mode ?? "manual"),
      providerCode: String(method.provider_code),
    },
    input.methodId,
    input.now ?? new Date()
  );
  if (refusal) return { ok: false, error: refusal };

  const provider = getProvider(String(method.provider_code));
  if (!provider) return { ok: false, error: "method_unavailable" };

  const { data: keys } = await admin
    .from("organization_payment_secrets")
    .select("merchant_id, secret_key")
    .eq("organization_payment_method_id", method.id)
    .maybeSingle();
  if (!keys?.secret_key) return { ok: false, error: "method_unavailable" };

  // The buyer pressed the button twice, or came back: hand over the payment already started.
  const { data: open } = await admin
    .from("payments")
    .select("id, metadata")
    .eq("booking_id", booking.id)
    .eq("payment_method_id", method.id)
    .in("status", ["pending", "processing"])
    .not("provider_payment_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const openUrl = (open?.metadata as Record<string, unknown> | null)?.redirect_url;
  if (open && typeof openUrl === "string") return { ok: true, redirectUrl: openUrl, paymentId: String(open.id) };

  const amount = Number(booking.total_amount);
  const currency = String(booking.currency ?? "KZT");

  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      booking_id: booking.id,
      organization_id: booking.organization_id,
      payment_method_id: method.id,
      provider_code: method.provider_code,
      amount,
      currency,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !payment) return { ok: false, error: "failed" };

  const title = (event?.title_ru as string | null) ?? (event?.title_kk as string | null) ?? "Билеты";
  const created = await provider.createPayment({
    paymentId: String(payment.id),
    orderNumber: String(booking.public_order_id),
    amount,
    currency,
    description: `${title} (${booking.public_order_id})`,
    returnUrl: `${input.origin}/payment/pending?order=${input.accessToken}`,
    webhookUrl: `${input.origin}/api/payments/webhook/${method.id}`,
    secrets: { merchantId: (keys.merchant_id as string | null) ?? null, secretKey: String(keys.secret_key) },
  });

  if (!created.ok) {
    // The provider could not start it. Nothing was charged; the buyer can simply try again.
    await admin.from("payments").update({ status: "failed", failure_reason: created.reason.slice(0, 200) }).eq("id", payment.id);
    return { ok: false, error: "provider_unavailable" };
  }

  const { error: updateError } = await admin
    .from("payments")
    .update({
      provider_payment_id: created.providerPaymentId,
      metadata: { ...(created.metadata ?? {}), redirect_url: created.redirectUrl },
    })
    .eq("id", payment.id);
  if (updateError) return { ok: false, error: "failed" };

  return { ok: true, redirectUrl: created.redirectUrl, paymentId: String(payment.id) };
}
