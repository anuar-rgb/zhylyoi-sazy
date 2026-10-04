import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PaymentStatus from "./PaymentStatus";

// Where a bank (or the pretend bank) sends the buyer afterwards. The segment only says what the
// bank claimed; PaymentStatus asks the server for the truth.
const OUTCOMES = new Set(["success", "failure", "pending"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ outcome: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { outcome } = await params;
  const { order } = await searchParams;
  if (!OUTCOMES.has(outcome)) notFound();
  if (!order || !UUID.test(order)) notFound();

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <PaymentStatus token={order} />
      </div>
    </section>
  );
}
