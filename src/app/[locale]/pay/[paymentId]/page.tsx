import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toSecrets } from "@/lib/payments/keys";
import { getProvider } from "@/lib/payments/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import Checkout from "./Checkout";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function holdHasEnded(expiresAt: string | null): boolean {
  return expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Opens the bank's form for one started payment. The token it needs is taken here, at the moment
 * the buyer needs it, and only while the payment can still be made; anything else goes back to the
 * order page, which says where the order stands.
 */
export default async function PayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const locale = await getLocale();
  if (!UUID.test(paymentId)) notFound();

  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, payment_method_id, provider_code, provider_payment_id, amount, currency, status, metadata")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) notFound();

  const { data: booking } = await admin
    .from("bookings")
    .select("access_token, status, expires_at")
    .eq("id", payment.booking_id)
    .maybeSingle();
  if (!booking) notFound();

  const open =
    (payment.status === "pending" || payment.status === "processing") &&
    booking.status === "pending" &&
    !holdHasEnded(booking.expires_at as string | null);

  const provider = getProvider(String(payment.provider_code));
  const { data: keys } = await admin
    .from("organization_payment_secrets")
    .select("merchant_id, client_id, secret_key")
    .eq("organization_payment_method_id", payment.payment_method_id)
    .maybeSingle();
  const secrets = toSecrets(keys);

  const form =
    open && secrets && provider?.checkoutForm && payment.provider_payment_id
      ? await provider.checkoutForm({
          providerPaymentId: String(payment.provider_payment_id),
          amount: Number(payment.amount),
          currency: String(payment.currency),
          language: locale,
          metadata: (payment.metadata as Record<string, unknown> | null) ?? {},
          secrets,
        })
      : null;

  if (!form) return redirect({ href: `/my-ticket/${String(booking.access_token)}`, locale });

  return <Checkout form={form} orderHref={`/my-ticket/${String(booking.access_token)}`} />;
}
