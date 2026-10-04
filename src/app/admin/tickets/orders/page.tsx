import Link from "next/link";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  formatMoment,
  formatMoney,
  getTicketingScope,
  listOrders,
  type OrderFilter,
} from "@/lib/ticketing/admin";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают оплаты" },
  { id: "paid", label: "Подтверждённые" },
  { id: "refunded", label: "Возвраты" },
  { id: "closed", label: "Отменённые и истёкшие" },
];

const BADGE: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700",
  confirmed: "bg-gold/15 text-ocean-dark",
  refunded: "bg-ocean/5 text-ocean/60",
  cancelled: "bg-ocean/5 text-ocean/40",
  expired: "bg-ocean/5 text-ocean/40",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; event?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Заказы" reason={scope.reason} />;

  const { status, event } = await searchParams;
  const filter = FILTERS.some((f) => f.id === status) ? (status as OrderFilter) : "all";
  const eventId = event && /^[0-9a-f-]{36}$/i.test(event) ? event : null;
  const orders = await listOrders(scope.organizationId, filter, eventId);

  const href = (f: OrderFilter) => `/admin/tickets/orders?${new URLSearchParams({ ...(f !== "all" ? { status: f } : {}), ...(eventId ? { event: eventId } : {}) })}`;

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">
        Заказы <span className="text-ocean/40 font-normal">({orders.length})</span>
      </h1>
      <p className="text-sm text-ocean/60 mb-5">
        Каждая бронь билетов — это заказ со своим номером. Здесь видно, оплачен ли он, чем и сколько человек уже вошло.
        Показаны последние 100.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={f.id === filter ? "page" : undefined}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              f.id === filter ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
            }`}
          >
            {f.label}
          </Link>
        ))}
        {eventId && (
          <Link href={href(filter)} className="px-4 py-2 rounded-full text-sm font-semibold text-ocean/60 hover:text-ocean">
            Показаны заказы одного мероприятия. Сбросить
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Заказов нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className={`${CARD} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-ocean">{order.orderNumber}</h2>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BADGE[order.status] ?? BADGE.cancelled}`}>
                  {order.status === "confirmed" && order.amount === 0 ? "Подтверждён (бесплатно)" : ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm text-ocean/70 mt-1">
                {order.buyerName} · {order.buyerPhone}
              </p>
              <p className="text-sm text-ocean/50">{order.eventTitle || "Мероприятие не найдено"}</p>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                <div>
                  <dt className="text-ocean/40">Сумма</dt>
                  <dd className="text-ocean/80 font-medium">{order.amount > 0 ? formatMoney(order.amount, order.currency) : "бесплатно"}</dd>
                </div>
                <div>
                  <dt className="text-ocean/40">Оплата</dt>
                  <dd className="text-ocean/80 font-medium">
                    {order.payment ? `${order.payment.provider} · ${PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}` : order.amount > 0 ? "вручную или ещё не начата" : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ocean/40">Билетов / вошло</dt>
                  <dd className="text-ocean/80 font-medium">
                    {order.tickets} / {order.checkedIn}
                  </dd>
                </div>
                <div>
                  <dt className="text-ocean/40">{order.payment?.paidAt ? "Оплачен" : "Создан"}</dt>
                  <dd className="text-ocean/80 font-medium">{formatMoment(order.payment?.paidAt ?? order.createdAt)}</dd>
                </div>
              </dl>

              {order.payment?.needsRefund && (
                <p className="mt-3 text-xs font-semibold text-red-700 bg-red-50 rounded-2xl px-3 py-2">
                  Нужен возврат. Откройте раздел «Платежи и возвраты».
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
