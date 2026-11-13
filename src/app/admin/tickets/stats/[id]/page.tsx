import Link from "next/link";
import { notFound } from "next/navigation";
import { getCultureEventById, isEventLocked } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { listEventSeatsForAdmin } from "@/lib/eventSeatCategories";
import { listEventTicketTypes } from "@/lib/eventTicketTypes";
import { pricesOf } from "@/lib/eventPrices";
import { getHallById, listHallRowLayouts, rowLayoutsForMap } from "@/lib/halls";
import { categoryLabel, categoryOptions } from "@/lib/seatCategories";
import { formatTime } from "@/lib/timeZone";
import { listSeatBlocks, listSeatOccupants } from "@/lib/ticketing/occupancy";
import { formatMoney, getEventStats, getTicketingScope, listOnlinePayments, listOrders } from "@/lib/ticketing/admin";
import NoProfile from "../../NoProfile";
import BackToTickets from "../../BackToTickets";
import SeatBlockMap, { orderAnchor } from "./SeatBlockMap";
import OrderCard from "./OrderCard";
import OrderList, { type OrderGroup } from "./OrderList";
import EventDetails from "../../../culture-events/EventDetails";
import CancelledNotice from "./CancelledNotice";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/timeZone";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";
const SECTION = "text-lg font-bold text-ocean mb-3";

/** Which filter of the order list an order's status falls under. */
function groupOf(status: string): OrderGroup {
  if (status === "confirmed") return "paid";
  if (status === "refunded") return "refunded";
  if (["pending", "payment_reported", "late_payment"].includes(status)) return "pending";
  return "closed";
}

/**
 * One event, all in one place, top to bottom: what the event is, its figures, its hall seat by seat
 * (sold, held, free, and seats closed for a guest or out of order) and its orders with refunds.
 * There is no separate orders page: an order is found from here, from the hall map or by its number
 * on the Билеты page. A past or archived event opens here too, read-only.
 */
export default async function EventOccupancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Заполняемость зала" reason={scope.reason} />;

  const event = await getCultureEventById(id);
  if (!event) notFound();

  const [seats, occupants, ticketTypes, hall, stats, orders, rowLayouts, blocks] = await Promise.all([
    event.hallId ? listEventSeatsForAdmin(id, event.hallId) : Promise.resolve([]),
    listSeatOccupants(id),
    listEventTicketTypes(id),
    event.hallId ? getHallById(event.hallId) : Promise.resolve(null),
    getEventStats(scope.organizationId),
    // Every order of the event, not the last 100 of the institution.
    listOrders(scope.organizationId, "all", id, 5000),
    event.hallId ? listHallRowLayouts(event.hallId) : Promise.resolve([]),
    listSeatBlocks(id),
  ]);
  const locked = isEventLocked(event);
  const online = await listOnlinePayments(orders.map((order) => order.id));
  // A cancelled event: the paid orders whose money is still with the institution.
  let notRefunded: string[] = [];
  if (event.cancelledAt) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bookings")
      .select("public_order_id")
      .eq("event_id", id)
      .in("status", ["confirmed", "late_payment"])
      .gt("total_amount", 0);
    notRefunded = (data ?? []).map((row) => String(row.public_order_id));
  }
  const prices = pricesOf(ticketTypes);
  // Hidden seats stay off the map, unless a ticket was sold for one before it was hidden.
  const shown = seats.filter((seat) => seat.isActive || occupants.has(seat.id));

  const count = { sold: 0, entered: 0, held: 0, free: 0, off: 0 };
  const byCategory = new Map<string, { total: number; taken: number }>();
  for (const seat of shown) {
    const occupant = occupants.get(seat.id);
    if (occupant) count[occupant.state]++;
    else if (seat.category in prices) count.free++;
    else count.off++;
    const line = byCategory.get(seat.category) ?? { total: 0, taken: 0 };
    line.total++;
    if (occupant && occupant.state !== "held") line.taken++;
    byCategory.set(seat.category, line);
  }
  const soldTotal = count.sold + count.entered;
  const fill = shown.length > 0 ? Math.round((soldTotal / shown.length) * 100) : 0;
  const revenue = stats.get(id)?.revenue ?? 0;

  const tiles: { label: string; value: string; strong?: boolean }[] = [
    { label: "Заполнено", value: `${fill}%`, strong: true },
    { label: "Продано мест", value: `${soldTotal} из ${shown.length}`, strong: true },
    { label: "Свободно", value: String(count.free) },
    { label: "Ожидают оплаты", value: String(count.held) },
    { label: "Вошли", value: String(count.entered) },
    { label: "Выручка", value: formatMoney(revenue) },
  ];

  const title = event.titleRu ?? event.titleKk ?? "Мероприятие";
  const hallName = hall ? (hall.nameRu ?? hall.nameKk ?? "Зал") : null;

  return (
    <div>
      {/* Back to Билеты: the event's page is opened from its card there, from the statistics or by an order number. */}
      <BackToTickets />

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{title}</h1>
        {/* All of a past event is on this page already; an upcoming one is still edited on its form. */}
        {!locked && (
          <Link href={`/admin/culture-events/${id}`} className="text-sm font-semibold text-ocean/60 hover:text-ocean mt-1">
            Изменить мероприятие
          </Link>
        )}
      </div>
      <p className="text-sm text-ocean/60 mb-6">
        {formatEventDateTime(event.eventDate)}
        {hallName && ` · ${hallName}`}
        {event.movedFrom && ` · перенесено с ${formatEventDateTime(event.movedFrom)}`}
        {locked && (event.cancelledAt ? " · отменено" : event.status === "archived" ? " · в архиве" : " · прошло")}
      </p>

      {event.cancelledAt && (
        <CancelledNotice
          eventId={id}
          cancelledAt={formatDateTime(event.cancelledAt)}
          reason={event.cancelReason}
          notRefunded={notRefunded}
        />
      )}

      <h2 className={SECTION}>Сведения о мероприятии</h2>
      <div className="mb-8">
        <EventDetails event={event} hallName={hallName} />
      </div>

      <h2 className={SECTION}>Показатели</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white border border-cream-dark rounded-2xl px-3 py-2.5">
            <dt className="text-xs text-ocean/50">{tile.label}</dt>
            <dd className={tile.strong ? "text-lg font-bold text-ocean" : "text-base font-semibold text-ocean/80"}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      {!event.hallId || shown.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60 text-sm">
            {event.hallId ? "В зале этого мероприятия ещё нет мест." : "У мероприятия не выбран зал, схемы мест нет."}
          </p>
        </div>
      ) : (
        <section className={`${CARD} p-4 sm:p-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-ocean">Схема зала</h2>
            <p className="text-xs text-ocean/50">
              Обновлено в {formatTime(new Date(), { seconds: true })}, обновляется само каждые 30 секунд
            </p>
          </div>

          <SeatBlockMap
            eventId={id}
            seats={shown.map((seat) => ({
              id: seat.id,
              section: seat.section,
              rowLabel: seat.rowLabel,
              seatNumber: seat.seatNumber,
              category: seat.category,
            }))}
            occupants={Object.fromEntries(occupants)}
            blocks={Object.fromEntries(blocks)}
            prices={prices}
            locked={locked}
            rowShape={hall?.rowShape}
            numbering={hall?.seatNumbering}
            rowLayouts={rowLayoutsForMap(rowLayouts)}
          />

          <ul className="mt-5 pt-4 border-t border-cream-dark grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {categoryOptions(byCategory.keys())
              .filter((category) => byCategory.has(category))
              .map((category) => {
                const line = byCategory.get(category)!;
                return (
                  <li key={category} className="flex justify-between gap-3">
                    <span className="text-ocean">
                      {categoryLabel(category)}
                      <span className="text-ocean/50">
                        {" · "}
                        {category in prices ? formatMoney(prices[category]) : "не продаётся"}
                      </span>
                    </span>
                    <span className="text-ocean/70 shrink-0">
                      продано {line.taken} из {line.total}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <h2 id="orders" className={`${SECTION} mt-8 scroll-mt-24`}>
        Заказы <span className="text-ocean/40 font-normal text-base">({orders.length})</span>
      </h2>
      <p className="text-sm text-ocean/60 mb-4">
        Покупатели платят картой на странице банка, билеты выдаются сами. Возврат оформляется здесь: за весь заказ или за
        отдельные места, деньги возвращает банк.
      </p>
      <OrderList
        items={orders.map((order) => ({
          key: order.id,
          anchor: orderAnchor(order.orderNumber),
          group: groupOf(order.status),
          card: <OrderCard order={order} online={online.get(order.id)} />,
        }))}
      />
    </div>
  );
}
