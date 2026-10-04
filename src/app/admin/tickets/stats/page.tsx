import Link from "next/link";
import { listAllTicketedCultureEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { formatMoney, getEventStats, getTicketingScope, type EventStats } from "@/lib/ticketing/admin";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

const EMPTY = (eventId: string): EventStats => ({
  eventId,
  sold: 0,
  waiting: 0,
  cancelled: 0,
  refunded: 0,
  checkedIn: 0,
  notCame: 0,
  revenue: 0,
});

export default async function StatsPage() {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Статистика" reason={scope.reason} />;

  const [{ current, other }, stats] = await Promise.all([
    listAllTicketedCultureEvents(),
    getEventStats(scope.organizationId),
  ]);
  const events = [...current, ...other];

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Статистика</h1>
      <p className="text-sm text-ocean/60 mb-6">
        По каждому мероприятию с билетами. «Продано» это билеты в подтверждённых заказах. «Не пришло» это проданные,
        но не использованные на входе. «Выручка» это сумма подтверждённых заказов без возвратов.
      </p>

      {events.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Мероприятий с билетами пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const s = stats.get(event.id) ?? EMPTY(event.id);
            const tiles: { label: string; value: string; strong?: boolean }[] = [
              { label: "Продано", value: String(s.sold), strong: true },
              { label: "Ожидают оплаты", value: String(s.waiting) },
              { label: "Отменено и истекло", value: String(s.cancelled) },
              { label: "Возвраты", value: String(s.refunded) },
              { label: "Вошло", value: String(s.checkedIn) },
              { label: "Не пришло", value: String(s.notCame) },
              { label: "Выручка", value: formatMoney(s.revenue), strong: true },
            ];
            return (
              <section key={event.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-bold text-ocean">{event.titleRu ?? event.titleKk}</h2>
                    <p className="text-xs text-ocean/50">{formatEventDateTime(event.eventDate)}</p>
                  </div>
                  <Link
                    href={`/admin/tickets/orders?event=${event.id}`}
                    className="text-xs font-semibold text-ocean hover:text-gold-dark shrink-0"
                  >
                    Заказы
                  </Link>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {tiles.map((tile) => (
                    <div key={tile.label} className="bg-cream/40 rounded-2xl px-3 py-2.5">
                      <dt className="text-xs text-ocean/50">{tile.label}</dt>
                      <dd className={`${tile.strong ? "text-lg font-bold text-ocean" : "text-base font-semibold text-ocean/80"}`}>
                        {tile.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
