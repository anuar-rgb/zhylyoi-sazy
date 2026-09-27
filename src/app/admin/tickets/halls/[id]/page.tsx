import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getHallById, listHallSeats } from "@/lib/halls";
import { listCultureEventsByHall } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import HallForm from "../HallForm";
import GenerateGridForm from "../GenerateGridForm";
import SeatMapEditor from "../SeatMapEditor";
import { updateHall } from "../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function EditHallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/halls");

  // RLS decides visibility, so a hall belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const hall = await getHallById(id);
  if (!hall) notFound();

  const seats = await listHallSeats(id);
  const events = await listCultureEventsByHall(id);

  return (
    <div>
      <Link
        href="/admin/tickets/halls"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Залы
      </Link>

      <HallForm hall={hall} action={updateHall} heading={hall.nameRu ?? hall.nameKk ?? "Зал"} />

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-ocean">
            Мероприятия <span className="text-ocean/40 font-normal text-base">({events.length})</span>
          </h2>
          <Link
            href={`/admin/culture-events/new?hallId=${hall.id}`}
            className="btn-primary px-5 py-2.5 text-sm font-semibold"
          >
            Добавить мероприятие
          </Link>
        </div>

        {events.length === 0 ? (
          <div className={CARD}>
            <p className="text-sm text-ocean/60">В этом зале пока нет мероприятий.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`${CARD} p-4 flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ocean truncate">{event.titleRu ?? event.titleKk}</p>
                  <p className="text-xs text-ocean/50">{formatEventDateTime(event.eventDate)}</p>
                </div>
                <Link
                  href={`/admin/culture-events/${event.id}/tickets`}
                  className="text-xs font-semibold text-ocean hover:text-gold-dark shrink-0"
                >
                  Билеты
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">
          Места <span className="text-ocean/40 font-normal text-base">({hall.totalCapacity})</span>
        </h2>

        {seats.length === 0 ? (
          <div className={CARD}>
            <p className="text-sm text-ocean/60 mb-4">
              В зале ещё нет мест. Задайте сетку один раз — дальше отдельные места можно будет менять и скрывать по
              одному.
            </p>
            <GenerateGridForm hallId={hall.id} />
          </div>
        ) : (
          <div className={CARD}>
            <SeatMapEditor seats={seats} />
          </div>
        )}
      </section>
    </div>
  );
}
