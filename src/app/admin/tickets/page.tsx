import Link from "next/link";
import { countActiveBookingsForEvents, listEventsWithTicketHistory } from "@/lib/bookingsAdmin";
import { deleteBlockedUntil } from "@/lib/eventArchive";
import { isEventLocked, listAllTicketedCultureEvents, type CultureEventRecord } from "@/lib/cultureEvents";
import { EVENT_STATUS_LABELS, formatEventDateTime } from "@/lib/eventFields";
import DeleteEventButton from "../culture-events/DeleteEventButton";
import MoreMenu from "./MoreMenu";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function TicketsPage() {
  const { current, other } = await listAllTicketedCultureEvents();
  const eventIds = [...current, ...other].map((event) => event.id);
  const [bookingCounts, sold] = await Promise.all([countActiveBookingsForEvents(eventIds), listEventsWithTicketHistory(eventIds)]);


  // A past or archived event opens read-only (isEventLocked); an upcoming one, a draft too, is still edited.
  function renderEvent(event: CultureEventRecord, note?: string) {
    // A past or archived one opens straight on its hall's occupancy: prices, sold seats and takings
    // are all there, and nothing about it can be changed any more.
    const locked = isEventLocked(event);
    const openLabel = locked ? "Открыть" : "Изменить";
    const cardHref = locked ? `/admin/tickets/stats/${event.id}` : `/admin/culture-events/${event.id}/tickets`;
    const openHref = locked ? `/admin/tickets/stats/${event.id}` : `/admin/culture-events/${event.id}`;
    return (
      <div key={event.id} className={`${CARD} relative p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        {/* Absolutely-positioned full-card link, not a wrapper around
            everything below: a <Link> can't contain another <Link>
            (invalid nested <a>), so "Изменить" / "Открыть" sits as a normal sibling
            above this one in stacking order instead — same pattern as
            the halls list. */}
        <Link
          href={cardHref}
          className="absolute inset-0 rounded-3xl"
          aria-label={`${locked ? "Заполняемость зала" : "Билеты"}: ${event.titleRu ?? event.titleKk}`}
        />
        <div className="min-w-0 pointer-events-none">
          <p className="font-semibold text-ocean truncate">{event.titleRu ?? event.titleKk}</p>
          <p className="text-xs text-ocean/50">
            {formatEventDateTime(event.eventDate)}
            {note ? ` · ${note}` : ""}
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* The event's orders, refunds, hall map and figures. A locked event's card opens there already. */}
          {!locked && (
            <Link href={`/admin/tickets/stats/${event.id}`} className="text-xs font-semibold text-ocean hover:text-gold-dark">
              Заказы и статистика
            </Link>
          )}
          <Link href={openHref} className="text-xs font-semibold text-ocean hover:text-gold-dark">
            {openLabel}
          </Link>
          <DeleteEventButton
            id={event.id}
            title={event.titleRu ?? event.titleKk ?? "мероприятие"}
            bookingCount={bookingCounts.get(event.id) ?? 0}
            keptUntil={deleteBlockedUntil(event, sold.has(event.id))?.toISOString() ?? null}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Билеты</h1>
        {/* Every admin action (pending payments, scanner, halls, payment
            methods) lives here now — this page opens straight on the events
            themselves, not a menu of places to go. */}
        <MoreMenu />
      </div>

      {/* A buyer calls with their order number: this opens the order on its event's page. */}
      <form action="/admin/tickets/find" className="flex gap-2 mb-8">
        <input
          name="number"
          required
          placeholder="Найти заказ по номеру, например DK-000154"
          aria-label="Номер заказа"
          autoComplete="off"
          className="min-w-0 flex-1 px-4 py-2.5 border border-cream-dark rounded-full bg-white text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button type="submit" className="btn-primary shrink-0 px-5 py-2.5 text-sm font-semibold">
          Найти
        </button>
      </form>

      <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">
        Актуальные мероприятия <span className="text-ocean/40 font-normal text-base">({current.length})</span>
      </h2>
      <p className="text-sm text-ocean/60 mb-4">
        Кино, спектакли и выступления, на которые сейчас продаются билеты — ровно то, что видит посетитель в разделе
        «Билеты» на сайте.
      </p>

      {current.length === 0 ? (
        <div className={`${CARD} text-center`}>
          <p className="text-ocean/60 text-sm">
            Сейчас нет мероприятий с продажей билетов. Добавьте мероприятие с залом в «Афише» или через страницу зала.
          </p>
        </div>
      ) : (
        <div className="space-y-2">{current.map((event) => renderEvent(event))}</div>
      )}

      {other.length > 0 && (
        <>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mt-10 mb-1">
            Прошедшие, отменённые и черновики <span className="text-ocean/40 font-normal text-base">({other.length})</span>
          </h2>
          <p className="text-sm text-ocean/60 mb-4">
            Билеты на них не продаются. Мероприятие, на которое выдавались билеты, хранится вместе с заказами 5 лет, потом его можно удалить.
          </p>
          <div className="space-y-2">
            {other.map((event) =>
              renderEvent(
                event,
                event.cancelledAt ? "отменено" : event.status === "published" ? "прошло" : (EVENT_STATUS_LABELS[event.status] ?? event.status)
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
