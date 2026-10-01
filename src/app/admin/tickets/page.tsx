import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPendingPaidBookings, countActiveBookingsForEvents } from "@/lib/bookingsAdmin";
import { listPublicTicketedCultureEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import DeleteEventButton from "../culture-events/DeleteEventButton";
import MoreMenu from "./MoreMenu";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function TicketsPage() {
  const identity = await getStaffIdentity();
  const organizationId = identity?.organizationId ?? (await getSiteOrganizationId());
  const [pendingCount, events] = await Promise.all([
    organizationId ? listPendingPaidBookings(organizationId).then((rows) => rows.length) : Promise.resolve(0),
    listPublicTicketedCultureEvents(),
  ]);
  const bookingCounts = await countActiveBookingsForEvents(events.map((event) => event.id));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Билеты</h1>
        {/* Every admin action (pending payments, scanner, halls, payment
            methods) lives here now — this page opens straight on the events
            themselves, not a menu of places to go. */}
        <MoreMenu pendingCount={pendingCount} />
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">
        Актуальные мероприятия <span className="text-ocean/40 font-normal text-base">({events.length})</span>
      </h2>
      <p className="text-sm text-ocean/60 mb-4">
        Кино, спектакли и выступления, на которые сейчас продаются билеты — ровно то, что видит посетитель в разделе
        «Билеты» на сайте.
      </p>

      {events.length === 0 ? (
        <div className={`${CARD} text-center`}>
          <p className="text-ocean/60 text-sm">
            Сейчас нет мероприятий с продажей билетов. Добавьте мероприятие с залом в «Афише» или через страницу зала.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className={`${CARD} relative p-4 flex flex-wrap items-center justify-between gap-3`}>
              {/* Absolutely-positioned full-card link, not a wrapper around
                  everything below: a <Link> can't contain another <Link>
                  (invalid nested <a>), so "Изменить" sits as a normal sibling
                  above this one in stacking order instead — same pattern as
                  the halls list. */}
              <Link
                href={`/admin/culture-events/${event.id}/tickets`}
                className="absolute inset-0 rounded-3xl"
                aria-label={`Билеты: ${event.titleRu ?? event.titleKk}`}
              />
              <div className="min-w-0 pointer-events-none">
                <p className="font-semibold text-ocean truncate">{event.titleRu ?? event.titleKk}</p>
                <p className="text-xs text-ocean/50">{formatEventDateTime(event.eventDate)}</p>
              </div>
              <div className="relative z-10 flex items-center gap-3 shrink-0">
                <Link
                  href={`/admin/culture-events/${event.id}`}
                  className="text-xs font-semibold text-ocean hover:text-gold-dark"
                >
                  Изменить
                </Link>
                <DeleteEventButton
                  id={event.id}
                  title={event.titleRu ?? event.titleKk ?? "мероприятие"}
                  bookingCount={bookingCounts.get(event.id) ?? 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
