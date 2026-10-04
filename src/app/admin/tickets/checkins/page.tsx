import Link from "next/link";
import { listAllTicketedCultureEvents } from "@/lib/cultureEvents";
import { CHECKIN_RESULT_LABEL, formatMoment, getTicketingScope, listCheckins } from "@/lib/ticketing/admin";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

const TONE: Record<string, string> = {
  ok: "bg-green-50 text-green-700",
  already_used: "bg-red-50 text-red-700",
  not_found: "bg-red-50 text-red-700",
  not_confirmed: "bg-red-50 text-red-700",
  wrong_event: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-red-50 text-red-700",
  not_started: "bg-gold/15 text-ocean-dark",
};

export default async function CheckinsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Журнал входов" reason={scope.reason} />;

  const { event } = await searchParams;
  const eventId = event && /^[0-9a-f-]{36}$/i.test(event) ? event : null;

  const [rows, { current, other }] = await Promise.all([
    listCheckins(scope.organizationId, eventId),
    listAllTicketedCultureEvents(),
  ]);
  const events = [...current, ...other];

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Журнал входов</h1>
      <p className="text-sm text-ocean/60 mb-5">
        Каждая проверка билета на входе: и успешная, и отказ с причиной. Записи нельзя удалить или изменить. Показаны
        последние 100.
      </p>

      {events.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/admin/tickets/checkins"
            aria-current={!eventId ? "page" : undefined}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              !eventId ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
            }`}
          >
            Все мероприятия
          </Link>
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/tickets/checkins?event=${e.id}`}
              aria-current={e.id === eventId ? "page" : undefined}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors max-w-full truncate ${
                e.id === eventId ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
              }`}
            >
              {e.titleRu ?? e.titleKk}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Проверок пока не было.</p>
        </div>
      ) : (
        <ul className={`${CARD} divide-y divide-cream-dark`}>
          {rows.map((row) => (
            <li key={row.id} className="px-4 sm:px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${TONE[row.result] ?? "bg-ocean/5 text-ocean/60"}`}>
                  {CHECKIN_RESULT_LABEL[row.result] ?? row.result}
                </span>
                <span className="text-xs text-ocean/50">{formatMoment(row.checkedAt)}</span>
              </div>
              <p className="text-sm text-ocean/80 mt-2">
                {row.orderNumber ? `Заказ ${row.orderNumber}` : "Билет не опознан"}
                {row.seat ? ` · ${row.seat}` : ""}
              </p>
              <p className="text-xs text-ocean/50">
                {row.eventTitle || "—"}
                {row.employee ? ` · проверил ${row.employee}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
