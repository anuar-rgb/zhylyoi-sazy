import Link from "next/link";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  formatMoment,
  formatMoney,
  getTicketingScope,
  listOnlinePayments,
  listOrders,
  type OrderFilter,
} from "@/lib/ticketing/admin";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";
import OrderActions from "./OrderActions";
import { BOOKING_STATUS_BADGE, toBookingStatus } from "@/lib/bookingStatus";
import { buyerContact } from "@/lib/buyer";
import { getCultureEventById, isEventLocked, listAllTicketedCultureEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { listEventSeatsForAdmin } from "@/lib/eventSeatCategories";
import { listEventTicketTypes } from "@/lib/eventTicketTypes";
import { pricesOf } from "@/lib/eventPrices";
import { getHallById, listHallRowLayouts, rowLayoutsForMap } from "@/lib/halls";
import { listSeatBlocks, listSeatOccupants } from "@/lib/ticketing/occupancy";
import SeatBlockMap from "./SeatBlockMap";
import EventPicker from "./EventPicker";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ждут оплаты" },
  { id: "paid", label: "Оплаченные" },
  { id: "refunded", label: "Возвраты" },
  { id: "closed", label: "Отклонённые и истёкшие" },
];

/** Unpaid holds first, then what is left of the earlier manual payment. */
const QUEUE_ORDER: Record<string, number> = { pending: 0, payment_reported: 1, late_payment: 2 };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; event?: string; view?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Заказы" reason={scope.reason} />;

  const { status, event, view } = await searchParams;
  // «Схема зала» is a tab of its own beside the filters: the hall instead of the list.
  const showMap = view === "map";
  const filter = FILTERS.some((f) => f.id === status) ? (status as OrderFilter) : "all";
  const eventId = event && /^[0-9a-f-]{36}$/i.test(event) ? event : null;
  const listed = showMap ? [] : await listOrders(scope.organizationId, filter, eventId);
  const onlinePayments = await listOnlinePayments(listed.map((order) => order.id));
  const orders =
    filter === "pending"
      ? [...listed].sort((a, b) => (QUEUE_ORDER[a.status] ?? 9) - (QUEUE_ORDER[b.status] ?? 9) || a.createdAt.localeCompare(b.createdAt))
      : listed;

  // The hall map: the chosen event, or else the nearest one still on sale.
  const ticketed = showMap ? await listAllTicketedCultureEvents() : { current: [], other: [] };
  const mapEventId = showMap ? (eventId ?? ticketed.current[0]?.id ?? ticketed.other[0]?.id ?? null) : null;
  const mapEvent = mapEventId ? await getCultureEventById(mapEventId) : null;
  const map =
    mapEvent?.hallId
      ? await Promise.all([
          listEventSeatsForAdmin(mapEvent.id, mapEvent.hallId),
          listSeatOccupants(mapEvent.id),
          listSeatBlocks(mapEvent.id),
          listEventTicketTypes(mapEvent.id),
          getHallById(mapEvent.hallId),
          listHallRowLayouts(mapEvent.hallId),
        ])
      : null;
  const pickerEvents = [
    ...ticketed.current.map((e) => ({ id: e.id, group: "current" as const, label: `${e.titleRu ?? e.titleKk ?? "Мероприятие"} · ${formatEventDateTime(e.eventDate)}` })),
    ...ticketed.other.map((e) => ({ id: e.id, group: "other" as const, label: `${e.titleRu ?? e.titleKk ?? "Мероприятие"} · ${formatEventDateTime(e.eventDate)}` })),
  ];

  // From the map, a filter goes back to the whole list; within the list it keeps the chosen event.
  const listEvent = showMap ? null : eventId;
  const href = (f: OrderFilter) => `/admin/tickets/orders?${new URLSearchParams({ ...(f !== "all" ? { status: f } : {}), ...(listEvent ? { event: listEvent } : {}) })}`;
  const mapHref = `/admin/tickets/orders?${new URLSearchParams({ view: "map", ...(eventId ? { event: eventId } : {}) })}`;

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">
        Заказы {!showMap && <span className="text-ocean/40 font-normal">({orders.length})</span>}
      </h1>
      <p className="text-sm text-ocean/60 mb-5">
        Покупатели платят картой на странице банка, билеты выдаются сами, подтверждать ничего не нужно. Возврат
        оформляется здесь: за весь заказ или за отдельные места, деньги возвращает банк. Показаны последние 100.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={!showMap && f.id === filter ? "page" : undefined}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              !showMap && f.id === filter ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <Link
          href={mapHref}
          aria-current={showMap ? "page" : undefined}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            showMap ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M6 10h12M5 14h14M7 18h10" />
          </svg>
          Схема зала
        </Link>
        {listEvent && (
          <Link href={href(filter)} className="px-4 py-2 rounded-full text-sm font-semibold text-ocean/60 hover:text-ocean">
            Показаны заказы одного мероприятия. Сбросить
          </Link>
        )}
      </div>

      {mapEvent && map && (
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-ocean">Схема зала</h2>
            <EventPicker events={pickerEvents} value={mapEvent.id} />
          </div>
          <SeatBlockMap
            eventId={mapEvent.id}
            seats={map[0].filter((seat) => seat.isActive || map[1].has(seat.id)).map((seat) => ({ id: seat.id, section: seat.section, rowLabel: seat.rowLabel, seatNumber: seat.seatNumber, category: seat.category }))}
            occupants={Object.fromEntries(map[1])}
            blocks={Object.fromEntries(map[2])}
            prices={pricesOf(map[3])}
            locked={isEventLocked(mapEvent)}
            rowShape={map[4]?.rowShape}
            numbering={map[4]?.seatNumbering}
            rowLayouts={rowLayoutsForMap(map[5])}
          />
        </section>
      )}

      {showMap ? (
        mapEvent && map ? null : (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ocean/60">Нет мероприятий с залом.</p>
          </div>
        )
      ) : orders.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Заказов нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className={`${CARD} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-ocean">{order.orderNumber}</h2>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BOOKING_STATUS_BADGE[toBookingStatus(order.status)]}`}>
                  {order.status === "confirmed" && order.amount === 0 ? "Подтверждён (бесплатно)" : ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm text-ocean/70 mt-1">
                {buyerContact(order)}
              </p>
              <p className="text-sm text-ocean/50">{order.eventTitle || "Мероприятие не найдено"}</p>

              {/* What the cashier knows before acting: until when the seats are held, the bank's
                  number, partial refunds and any note already written down. */}
              {(order.payment?.bankNumber || order.resolutionNote || order.refundedAmount > 0 || (order.expiresAt && ["pending", "payment_reported"].includes(order.status))) && (
                <ul className="mt-2 text-xs text-ocean/70 space-y-0.5">
                  {order.expiresAt && ["pending", "payment_reported"].includes(order.status) && (
                    <li>Места держатся до {formatMoment(order.expiresAt)}</li>
                  )}
                  {order.payment?.bankNumber && <li>Номер в банке: <span className="break-all">{order.payment.bankNumber}</span></li>}
                  {order.refundedAmount > 0 && order.status === "confirmed" && (
                    <li className="font-semibold text-red-700">
                      Возвращено за часть мест: {formatMoney(order.refundedAmount, order.currency)}
                    </li>
                  )}
                  {order.resolutionNote && <li>Комментарий: {order.resolutionNote}</li>}
                </ul>
              )}

              {/* What can still happen to the order: a paid one goes back through the bank, whole or seat
                  by seat, a free one is cancelled. A past or archived event's orders are history. */}
              {(order.amount > 0 ? ["pending", "payment_reported", "confirmed"] : ["confirmed"]).includes(order.status) && (
                <div className="mt-3 bg-cream/40 border border-cream-dark rounded-2xl px-3 py-3">
                  {order.eventLocked ? (
                    <p className="text-xs text-ocean/50">Мероприятие прошло или в архиве — действия с оплатой недоступны.</p>
                  ) : (
                    <OrderActions
                      paidOnline={onlinePayments.get(order.id)?.paid === true}
                      needsRefund={onlinePayments.get(order.id)?.needsRefund === true}
                      free={order.amount === 0}
                      seats={order.items.filter((item) => item.active).map((item) => ({ id: item.id, name: item.name, price: item.price, checkedIn: Boolean(item.checkedInAt) }))}
                      order={{
                        id: order.id,
                        status: toBookingStatus(order.status),
                        orderNumber: order.orderNumber,
                        eventTitle: order.eventTitle,
                        tickets: order.tickets,
                        amountText: formatMoney(order.amount, order.currency),
                        buyer: buyerContact(order),
                      }}
                    />
                  )}
                </div>
              )}

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                <div>
                  <dt className="text-ocean/40">Сумма</dt>
                  <dd className="text-ocean/80 font-medium">{order.amount > 0 ? formatMoney(order.amount, order.currency) : "бесплатно"}</dd>
                </div>
                <div>
                  <dt className="text-ocean/40">Оплата</dt>
                  <dd className="text-ocean/80 font-medium">
                    {order.payment ? `${order.payment.provider} · ${PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}` : order.amount > 0 ? "ещё не начата" : "—"}
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

              {/* Seat by seat, for checking someone in by hand when the scanner is not at hand. */}
              {order.status === "confirmed" && order.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {order.items.filter((item) => item.active || item.refundedAt).map((item) => (
                    <span
                      key={item.id}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.refundedAt ? "bg-red-50 text-red-700 line-through" : item.checkedInAt ? "bg-gold/15 text-ocean-dark" : "bg-ocean/5 text-ocean/50"
                      }`}
                    >
                      {item.name}
                      {item.refundedAt ? " · возврат" : item.checkedInAt ? ` · вход ${formatMoment(item.checkedInAt)}` : ""}
                    </span>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
