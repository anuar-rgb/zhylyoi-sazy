import Link from "next/link";
import { listAllTicketedCultureEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { formatMoney, getEventStats, getTicketingScope, totalStats, type EventStats } from "@/lib/ticketing/admin";
import { INSTITUTION_OFFSET_MS } from "@/lib/timeZone";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";
const CHIP = "px-4 py-2 rounded-full text-sm font-semibold transition-colors";
const CHIP_ON = "bg-ocean text-cream";
const CHIP_OFF = "bg-white border border-cream-dark text-ocean/70 hover:text-ocean";

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

/** The calendar year of an event at the institution. */
function yearOf(eventDate: string): number {
  return new Date(new Date(eventDate).getTime() + INSTITUTION_OFFSET_MS).getUTCFullYear();
}

/**
 * The institution's ticket figures over all its events: the totals, then every event ranked by its
 * takings, so it is clear which concert brought the most. One event's own figures, hall and orders
 * are on its page (/admin/tickets/stats/[id]).
 */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ year?: string; sort?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Статистика" reason={scope.reason} />;

  const { year: yearParam, sort: sortParam } = await searchParams;
  const [{ current, other }, stats] = await Promise.all([listAllTicketedCultureEvents(), getEventStats(scope.organizationId)]);
  const all = [...current, ...other];

  const years = [...new Set(all.map((event) => yearOf(event.eventDate)))].sort((a, b) => b - a);
  const year = years.includes(Number(yearParam)) ? Number(yearParam) : null;
  const sort = sortParam === "date" ? "date" : "revenue";

  const rows = all
    .filter((event) => year === null || yearOf(event.eventDate) === year)
    .map((event) => ({ event, s: stats.get(event.id) ?? EMPTY(event.id) }))
    .sort((a, b) =>
      sort === "date" ? b.event.eventDate.localeCompare(a.event.eventDate) : b.s.revenue - a.s.revenue || b.s.sold - a.s.sold
    );
  const totals = totalStats(rows.map((row) => row.s));
  const top = Math.max(1, ...rows.map((row) => row.s.revenue));

  const href = (next: { year?: number | null; sort?: string }) => {
    const y = next.year === undefined ? year : next.year;
    const s = next.sort ?? sort;
    const params = new URLSearchParams({ ...(y ? { year: String(y) } : {}), ...(s !== "revenue" ? { sort: s } : {}) });
    const query = params.toString();
    return `/admin/tickets/stats${query ? `?${query}` : ""}`;
  };

  const tiles: { label: string; value: string; hint?: string; strong?: boolean }[] = [
    { label: "Выручка", value: formatMoney(totals.revenue), strong: true },
    { label: "Продано билетов", value: String(totals.sold), strong: true },
    { label: "Мероприятий с продажами", value: `${totals.eventsWithSales} из ${totals.events}` },
    { label: "Средняя выручка", value: totals.averageRevenue === null ? "—" : formatMoney(totals.averageRevenue), hint: "на мероприятие с продажами" },
    { label: "Пришли", value: totals.attendance === null ? "—" : `${totals.attendance}%`, hint: `${totals.checkedIn} из ${totals.sold}` },
    { label: "Возвращено билетов", value: String(totals.refunded) },
  ];

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Статистика</h1>
      <p className="text-sm text-ocean/60 mb-5">
        Все мероприятия с билетами. «Выручка» это деньги за билеты без возвратов. Расходов сайт не знает, поэтому это не
        прибыль. Подробности, схема зала и заказы открываются на странице мероприятия.
      </p>

      {years.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href={href({ year: null })} aria-current={year === null ? "page" : undefined} className={`${CHIP} ${year === null ? CHIP_ON : CHIP_OFF}`}>
            За всё время
          </Link>
          {years.map((y) => (
            <Link key={y} href={href({ year: y })} aria-current={year === y ? "page" : undefined} className={`${CHIP} ${year === y ? CHIP_ON : CHIP_OFF}`}>
              {y}
            </Link>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white border border-cream-dark rounded-2xl px-3 py-2.5">
            <dt className="text-xs text-ocean/50">{tile.label}</dt>
            <dd className={tile.strong ? "text-lg font-bold text-ocean" : "text-base font-semibold text-ocean/80"}>{tile.value}</dd>
            {tile.hint && <dd className="text-[11px] text-ocean/40">{tile.hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-ocean">По мероприятиям</h2>
        <div className="flex gap-2">
          <Link href={href({ sort: "revenue" })} aria-current={sort === "revenue" ? "page" : undefined} className={`${CHIP} ${sort === "revenue" ? CHIP_ON : CHIP_OFF}`}>
            По выручке
          </Link>
          <Link href={href({ sort: "date" })} aria-current={sort === "date" ? "page" : undefined} className={`${CHIP} ${sort === "date" ? CHIP_ON : CHIP_OFF}`}>
            По дате
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Мероприятий с билетами пока нет.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map(({ event, s }, index) => {
            const share = totals.revenue > 0 ? Math.round((s.revenue / totals.revenue) * 100) : 0;
            const came = s.sold > 0 ? Math.round((s.checkedIn / s.sold) * 100) : null;
            return (
              <li key={event.id} className={`${CARD} relative p-4`}>
                <Link href={`/admin/tickets/stats/${event.id}`} className="absolute inset-0 rounded-3xl" aria-label={`Подробно: ${event.titleRu ?? event.titleKk}`} />
                <div className="flex items-start justify-between gap-3 pointer-events-none">
                  <div className="min-w-0 flex gap-3">
                    {sort === "revenue" && <span className="text-sm font-bold text-ocean/30 w-6 shrink-0 tabular-nums">{index + 1}</span>}
                    <div className="min-w-0">
                      <p className="font-semibold text-ocean truncate">{event.titleRu ?? event.titleKk}</p>
                      <p className="text-xs text-ocean/50">
                        {formatEventDateTime(event.eventDate)}
                        {event.cancelledAt ? " · отменено" : ""}
                      </p>
                      <p className="text-xs text-ocean/70 mt-1">
                        продано {s.sold}
                        {came !== null && ` · пришли ${came}%`}
                        {s.refunded > 0 && ` · возвратов ${s.refunded}`}
                        {s.waiting > 0 && ` · ждут оплаты ${s.waiting}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ocean tabular-nums">{formatMoney(s.revenue)}</p>
                    {totals.revenue > 0 && <p className="text-xs text-ocean/50">{share}% выручки</p>}
                  </div>
                </div>
                {/* Takings against the best event in the list, so the ranking is seen at a glance. */}
                <div className="mt-3 h-1.5 rounded-full bg-cream overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round((s.revenue / top) * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
