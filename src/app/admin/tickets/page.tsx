import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPendingPaidBookings } from "@/lib/bookingsAdmin";
import { listPublicTicketedCultureEvents } from "@/lib/cultureEvents";
import { formatEventDateTime } from "@/lib/eventFields";
import MoreMenu from "./MoreMenu";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-gold-dark">
      {label}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </Link>
  );
}

export default async function TicketsPage() {
  const identity = await getStaffIdentity();
  const organizationId = identity?.organizationId ?? (await getSiteOrganizationId());
  const [pendingCount, events] = await Promise.all([
    organizationId ? listPendingPaidBookings(organizationId).then((rows) => rows.length) : Promise.resolve(0),
    listPublicTicketedCultureEvents(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Билеты</h1>
        {/* Setup/config, opened rarely — everything staff check day to day
            (pending payments, scanner, the events themselves) stays on this
            page directly instead of being one more click away. */}
        <MoreMenu />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-ocean">Ожидают оплаты</p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold leading-none">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-xs text-ocean/40 mb-4">Платные брони, где место держится, но оплату ещё не подтвердили.</p>
          <CardLink href="/admin/tickets/bookings" label="Ожидают оплаты" />
        </div>

        <div className={CARD}>
          <p className="text-sm font-semibold text-ocean mb-1">Сканер билетов</p>
          <p className="text-xs text-ocean/40 mb-4">Подтверждение билета на входе — камера или код вручную.</p>
          <CardLink href="/admin/tickets/scan" label="Сканер" />
        </div>
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
            <div key={event.id} className={`${CARD} p-4 flex flex-wrap items-center justify-between gap-3`}>
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
    </div>
  );
}
