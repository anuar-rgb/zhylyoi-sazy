import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureEventById, hasEventStarted } from "@/lib/cultureEvents";
import { listEventSeatsForAdmin } from "@/lib/eventSeatCategories";
import { listEventTicketTypes } from "@/lib/eventTicketTypes";
import { listEventPriceCategories, pricesOf } from "@/lib/eventPrices";
import { getHallById } from "@/lib/halls";
import EventSeatMap from "./EventSeatMap";
import EventPricesForm from "./EventPricesForm";
import TakeHallSeatsButton from "./TakeHallSeatsButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function EventTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-events");

  // RLS decides visibility, so an event belonging to another institution simply
  // is not found rather than being refused.
  const event = await getCultureEventById(id);
  if (!event) notFound();

  const [eventSeats, ticketTypes, hall] = await Promise.all([
    event.hallId ? listEventSeatsForAdmin(id, event.hallId) : Promise.resolve([]),
    listEventTicketTypes(id),
    event.hallId ? getHallById(event.hallId) : Promise.resolve(null),
  ]);
  const hallName = hall ? (hall.nameRu ?? hall.nameKk ?? "Зал") : "";
  // Every category of the hall plus those this event marked itself: one price field each.
  const categories = event.hallId ? await listEventPriceCategories(id, event.hallId, ticketTypes) : [];

  const eventTitle = event.titleRu ?? event.titleKk ?? "Мероприятие";
  const isDraft = event.status === "draft";
  const isPast = !isDraft && hasEventStarted(event);
  // Only an event on sale right now re-takes its seats from the hall: a draft has just taken
  // them and sold nothing, a past one sells nothing any more.
  const onSale = event.status === "published" && !isPast;

  return (
    <div>
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Билеты
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1">Билеты: {eventTitle}</h1>

      {!event.hallId ? (
        <div className={`${CARD} mt-4`}>
          <p className="text-sm text-ocean/60">
            У мероприятия не выбран зал. Выберите зал в карточке мероприятия — тогда здесь появятся его места и поле
            цены для каждой категории.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <p className="text-sm text-ocean/60 max-w-2xl">
              Места и категории пришли из зала «{hallName}». Цены и категории мест здесь — только для этого
              мероприятия: зал и другие мероприятия это не затронет.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/tickets/stats/${id}`}
                className="text-sm font-semibold text-cream bg-ocean rounded-full px-4 py-2 hover:bg-ocean-dark transition-colors"
              >
                Заполняемость зала
              </Link>
              {onSale && <TakeHallSeatsButton eventId={id} hallName={hallName} />}
            </div>
          </div>

          {isPast && (
            <div className="mb-6 bg-cream/60 border border-cream-dark rounded-2xl px-4 py-3 text-sm text-ocean/70">
              Мероприятие уже прошло, продажа билетов закрыта. Цены и места здесь можно посмотреть, но покупателям
              они больше не показываются.
            </div>
          )}

          {isDraft && (
            <div className="mb-6 bg-gold/10 border border-gold/30 rounded-2xl px-4 py-3 text-sm text-ocean">
              <p className="font-semibold mb-1">Это черновик</p>
              <p className="text-ocean/70">
                Посетители его не видят, билеты пока не продаются. Задайте цены ниже и при необходимости отметьте места
                на схеме. Когда всё готово, откройте{" "}
                <Link href={`/admin/culture-events/${id}`} className="font-semibold text-ocean underline underline-offset-2 hover:text-gold-dark">
                  карточку мероприятия
                </Link>{" "}
                и поставьте статус «Опубликовано» — тогда начнётся продажа.
              </p>
            </div>
          )}

          <section className="mb-8">
            <h2 className="text-lg font-bold text-ocean mb-4">Цены билетов</h2>
            <div className={CARD}>
              <EventPricesForm eventId={id} categories={categories} prices={pricesOf(ticketTypes)} />
            </div>
          </section>

          {eventSeats.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-ocean mb-4">Категории мест этого мероприятия</h2>
              <div className={CARD}>
                <EventSeatMap eventId={id} seats={eventSeats} categories={categories} />
              </div>
            </section>
          ) : (
            <div className={`${CARD} text-center`}>
              <p className="text-ocean/60 text-sm">
                В зале ещё нет мест — создайте сетку мест в разделе «Залы», тогда здесь появится схема.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
