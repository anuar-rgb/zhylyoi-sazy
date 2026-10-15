import Link from "next/link";
import type { CultureEventRecord } from "@/lib/cultureEvents";
import DeleteEventButton from "./DeleteEventButton";
import EventDetails from "./EventDetails";

/**
 * A past or archived event without a hall (an Афиша one): its details, nothing to change, and the
 * delete button. One with a hall opens on its report instead (/admin/tickets/stats/[id]).
 */
export default function EventSummary({ event, bookingCount }: { event: CultureEventRecord; bookingCount: number }) {
  const backHref = event.hallId ? "/admin/tickets" : "/admin/culture-events";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{event.titleRu ?? event.titleKk ?? "Мероприятие"}</h1>
        <Link href={backHref} className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Назад
        </Link>
      </div>

      <p className="text-sm text-ocean/60 mb-5">
        {event.status === "archived" ? "В архиве" : "Прошло"} · только просмотр. Изменить его нельзя, это сохраняет
        историю продаж.
      </p>

      <EventDetails event={event} hallName={null} />

      <div className="flex justify-end mt-5">
        <DeleteEventButton
          id={event.id}
          title={event.titleRu ?? event.titleKk ?? "мероприятие"}
          redirectHref={backHref}
          bookingCount={bookingCount}
        />
      </div>
    </div>
  );
}
