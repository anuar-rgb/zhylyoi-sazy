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
import OrderActions from "./OrderActions";
import { seatName } from "@/lib/hallSections";
import { BOOKING_STATUS_BADGE, toBookingStatus } from "@/lib/bookingStatus";
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
  { id: "pending", label: "Ждут проверки" },
  { id: "paid", label: "Оплаченные" },
  { id: "refunded", label: "Возвраты" },
  { id: "closed", label: "Отклонённые и истёкшие" },
];

/** In the cashier's queue: the buyer said they paid first, then unpaid holds, then late payments. */
const QUEUE_ORDER: Record<string, number> = { payment_reported: 0, pending: 1, late_payment: 2 };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; event?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Заказы" reason={scope.reason} />;

  const { status, event } = await searchParams;
  const filter = FILTERS.some((f) => f.id === status) ? (status as OrderFilter) : "all";
  const eventId = event && /^[0-9a-f-]{36}$/i.test(event) ? event : null;
  const listed = await listOrders(scope.organizationId, filter, eventId);
  const orders =
    filter === "pending"
      ? [...listed].sort((a, b) => (QUEUE_ORDER[a.status] ?? 9) - (QUEUE_ORDER[b.status] ?? 9) || a.createdAt.localeCompare(b.createdAt))
      : listed;

  // The hall map: the chosen event, or else the nearest one still on sale.
  const ticketed = await listAllTicketedCultureEvents();
  const mapEventId = eventId ?? ticketed.current[0]?.id ?? null;
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

  const href = (f: OrderFilter) => `/admin/tickets/orders?${new URLSearchParams({ ...(f !== "all" ? { status: f } : {}), ...(eventId ? { event: eventId } : {}) })}`;

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">
        Заказы <span className="text-ocean/40 font-normal">({orders.length})</span>
      </h1>
      <p className="text-sm text-ocean/60 mb-5">
        Оплата ручная: найдите поступление в Kaspi Pay (сумма, время, номер заказа) и только тогда нажмите
        «Подтвердить оплату» — после этого покупатель получит билеты. «Покупатель сообщил об оплате» — это не
        оплата, а просьба проверить. Показаны последние 100.
      </p>

      {mapEvent && map && (
        <section className={`${CARD} p-4 sm:p-5 mb-6`}>
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
            rowLayouts={rowLayoutsForMap(map[5])}
          />
        </section>
      )}

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
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BOOKING_STATUS_BADGE[toBookingStatus(order.status)]}`}>
                  {order.status === "confirmed" && order.amount === 0 ? "Подтверждён (бесплатно)" : ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-sm text-ocean/70 mt-1">
                {order.buyerName} · {order.buyerPhone}
              </p>
              <p className="text-sm text-ocean/50">{order.eventTitle || "Мероприятие не найдено"}</p>

              {/* What the cashier knows before acting: when the buyer said they paid, until when the
                  seats are held, the Kaspi operation number and any note already written down. */}
              {(order.paymentReportedAt || order.kaspiOperationId || order.resolutionNote || (order.expiresAt && ["pending", "payment_reported"].includes(order.status))) && (
                <ul className="mt-2 text-xs text-ocean/70 space-y-0.5">
                  {order.paymentReportedAt && (
                    <li className="font-semibold text-orange-800">Покупатель нажал «Я оплатил» в {formatMoment(order.paymentReportedAt)}</li>
                  )}
                  {order.expiresAt && ["pending", "payment_reported"].includes(order.status) && (
                    <li>Места держатся до {formatMoment(order.expiresAt)}</li>
                  )}
                  {order.kaspiOperationId && <li>Операция Kaspi: {order.kaspiOperationId}</li>}
                  {order.resolutionNote && <li>Комментарий: {order.resolutionNote}</li>}
                </ul>
              )}

              {/* A paid order's actions. Free orders confirm themselves at creation and never wait;
                  a past or archived event's orders are history and change no more. */}
              {order.amount > 0 && ["pending", "payment_reported", "expired", "rejected", "late_payment", "confirmed"].includes(order.status) && (
                <div className="mt-3 bg-cream/40 border border-cream-dark rounded-2xl px-3 py-3">
                  {order.eventLocked ? (
                    <p className="text-xs text-ocean/50">Мероприятие прошло или в архиве — действия с оплатой недоступны.</p>
                  ) : (
                    <OrderActions
                      order={{
                        id: order.id,
                        status: toBookingStatus(order.status),
                        orderNumber: order.orderNumber,
                        eventTitle: order.eventTitle,
                        tickets: order.tickets,
                        amountText: formatMoney(order.amount, order.currency),
                        buyerName: order.buyerName,
                        buyerPhone: order.buyerPhone,
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

              {/* Seat by seat, for checking someone in by hand when the scanner is not at hand. */}
              {order.status === "confirmed" && order.seats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {order.seats.map((s) => (
                    <span
                      key={`${s.section}-${s.row}-${s.seat}`}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.checkedInAt ? "bg-gold/15 text-ocean-dark" : "bg-ocean/5 text-ocean/50"
                      }`}
                    >
                      {seatName({ section: s.section, rowLabel: s.row, seatNumber: s.seat })}
                      {s.checkedInAt ? ` · вход ${formatMoment(s.checkedInAt)}` : ""}
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
