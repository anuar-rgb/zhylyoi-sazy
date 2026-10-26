import Link from "next/link";
import { notFound } from "next/navigation";
import { getCultureEventById, isEventLocked } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { listEventSeatsForAdmin } from "@/lib/eventSeatCategories";
import { listEventTicketTypes } from "@/lib/eventTicketTypes";
import { pricesOf } from "@/lib/eventPrices";
import { getHallById } from "@/lib/halls";
import { categoryLabel, categoryOptions } from "@/lib/seatCategories";
import { formatTime } from "@/lib/timeZone";
import { listSeatOccupants, listSoldTickets } from "@/lib/ticketing/occupancy";
import { formatMoney, getEventStats, getTicketingScope } from "@/lib/ticketing/admin";
import NoProfile from "../../NoProfile";
import OccupancyMap from "./OccupancyMap";
import SoldTickets from "./SoldTickets";
import EventDetails from "../../../culture-events/EventDetails";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";
const SECTION = "text-lg font-bold text-ocean mb-3";

/**
 * One event's report, top to bottom: what the event is, its figures, its hall seat by seat (sold,
 * held, free) and the list of sold tickets. A past or archived event opens here, not on its form.
 */
export default async function EventOccupancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Заполняемость зала" reason={scope.reason} />;

  const event = await getCultureEventById(id);
  if (!event) notFound();

  const [seats, occupants, ticketTypes, hall, stats, sold] = await Promise.all([
    event.hallId ? listEventSeatsForAdmin(id, event.hallId) : Promise.resolve([]),
    listSeatOccupants(id),
    listEventTicketTypes(id),
    event.hallId ? getHallById(event.hallId) : Promise.resolve(null),
    getEventStats(scope.organizationId),
    listSoldTickets(id),
  ]);
  const locked = isEventLocked(event);
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
      <Link
        href="/admin/tickets/stats"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Статистика
      </Link>

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
        {locked && (event.status === "archived" ? " · в архиве" : " · прошло")}
      </p>

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

          <OccupancyMap
            seats={shown.map((seat) => ({
              id: seat.id,
              section: seat.section,
              rowLabel: seat.rowLabel,
              seatNumber: seat.seatNumber,
              category: seat.category,
            }))}
            occupants={Object.fromEntries(occupants)}
            prices={prices}
            ordersHref={`/admin/tickets/orders?event=${id}`}
            rowShape={hall?.rowShape}
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

      <h2 className={`${SECTION} mt-8`}>
        Проданные билеты <span className="text-ocean/40 font-normal text-base">({sold.length})</span>
      </h2>
      <section className={`${CARD} overflow-hidden`}>
        <SoldTickets tickets={sold} />
      </section>
    </div>
  );
}
