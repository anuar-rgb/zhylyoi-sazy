import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTicketingScope } from "@/lib/ticketing/admin";
import { normalizeOrderNumber } from "@/lib/orderNumber";
import NoProfile from "../NoProfile";
import BackToTickets from "../BackToTickets";

/**
 * «Найти заказ» from the Билеты page: a buyer calls with their order number, and this opens the
 * order on its event's page. Only this institution's orders are looked up (RLS and the filter).
 */
export default async function FindOrderPage({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Поиск заказа" reason={scope.reason} />;

  const { number } = await searchParams;
  const orderNumber = normalizeOrderNumber(number ?? "");
  if (orderNumber) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bookings")
      .select("event_id")
      .eq("organization_id", scope.organizationId)
      .eq("public_order_id", orderNumber)
      .maybeSingle();
    if (data?.event_id) redirect(`/admin/tickets/stats/${data.event_id}#order-${orderNumber}`);
  }

  return (
    <div>
      <BackToTickets />
      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
        <p className="font-semibold text-ocean mb-2">{orderNumber ? `Заказ ${orderNumber} не найден` : "Номер заказа не распознан"}</p>
        <p className="text-sm text-ocean/60 mb-4">
          Номер заказа выглядит так: DK-000154. Его видно в письме с билетами и на странице заказа у покупателя.
        </p>
        <Link href="/admin/tickets" className="text-sm font-semibold text-ocean hover:text-gold-dark">
          Вернуться к билетам
        </Link>
      </div>
    </div>
  );
}
