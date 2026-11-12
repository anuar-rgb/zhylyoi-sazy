import Link from "next/link";
import { getDoorIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listCheckInEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import { listPublicEventSeats } from "@/lib/eventSeatCategories";
import { getHallById, listHallRowLayouts, rowLayoutsForMap } from "@/lib/halls";
import { getDoorState } from "@/lib/ticketing/door";
import DoorClient from "./DoorClient";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

/**
 * The door: pick the event, scan tickets, and see the hall with the seats already inside in
 * green. For a controller this is the whole site; staff can open it too.
 */
export default async function DoorPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const identity = await getDoorIdentity();
  if (!identity) {
    return (
      <div className={`${CARD} p-8 text-center`}>
        <p className="font-semibold text-ocean mb-2">Нет доступа</p>
        <p className="text-sm text-ocean/60">Доступ к проверке билетов выключен или не настроен. Обратитесь к администратору Дома культуры.</p>
      </div>
    );
  }

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  const events = (await listCheckInEvents()).filter((event) => event.organizationId === organizationId);
  const { event: wanted } = await searchParams;
  const current = events.find((event) => event.id === wanted) ?? events[0] ?? null;

  const [seats, state, hall, rowLayouts] = current?.hallId
    ? await Promise.all([
        listPublicEventSeats(current.id, current.hallId),
        getDoorState(current.id),
        getHallById(current.hallId),
        listHallRowLayouts(current.hallId),
      ])
    : [[], { entered: [], broken: [], sold: 0 }, null, []];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="text-sm text-ocean/60">{identity.displayName}</p>
        {!identity.isController && (
          <Link href="/admin/tickets" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
            ← Панель управления
          </Link>
        )}
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-5">Проверка билетов</h1>
      <DoorClient
        events={events.map((event) => ({
          id: event.id,
          title: event.titleRu ?? event.titleKk ?? "Мероприятие",
          when: formatEventDateTime(event.eventDate),
        }))}
        currentId={current?.id ?? null}
        seats={seats.map((seat) => ({
          id: seat.id,
          section: seat.section,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          category: seat.category,
        }))}
        entered={state.entered}
        broken={state.broken}
        sold={state.sold}
        rowShape={hall?.rowShape}
        numbering={hall?.seatNumbering}
        rowLayouts={rowLayoutsForMap(rowLayouts)}
      />
    </div>
  );
}
