import { notFound } from "next/navigation";
import { isMockEnabled } from "@/lib/payments/dev";
import { createAdminClient } from "@/lib/supabase/admin";
import MockBankClient from "./MockBankClient";

/** DEVELOPMENT ONLY. The pretend bank page the mock provider sends the buyer to. */
export default async function MockBankPage({ params }: { params: Promise<{ paymentId: string }> }) {
  if (!isMockEnabled()) notFound();

  const { paymentId } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: payment } = await admin
    .from("payments")
    .select("id, amount, currency, status, provider_code, booking_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.provider_code !== "mock") notFound();

  const { data: booking } = await admin
    .from("bookings")
    .select("public_order_id, access_token")
    .eq("id", payment.booking_id)
    .maybeSingle();
  if (!booking) notFound();

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-widest text-red-600 uppercase mb-2">Тестовый банк, без денег</p>
          <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1">Оплата заказа {String(booking.public_order_id)}</h1>
          <p className="text-ocean/70 mb-6">
            К оплате: <span className="font-bold text-ocean">{Number(payment.amount)} {String(payment.currency)}</span>
          </p>
          <MockBankClient paymentId={String(payment.id)} orderToken={String(booking.access_token)} />
        </div>
      </div>
    </section>
  );
}
