import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import { getPublicCultureEventBySlug } from "@/lib/cultureEvents";
import { listPublicHallSeats } from "@/lib/halls";
import { listPublicEventTicketTypes } from "@/lib/eventTicketTypes";
import { getTakenSeatIds } from "@/lib/bookings";
import SeatPicker, { type SeatOption } from "./SeatPicker";
import type { Locale } from "@/i18n/routing";

/** Picks the viewer's language, falling back to the other rather than showing nothing. */
function localizedName(kk: string | null, ru: string | null, locale: Locale): string | null {
  return locale === "kk" ? (kk ?? ru) : (ru ?? kk);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicCultureEventBySlug(slug);
  if (!event) return {};
  return { title: `Билеты: ${event.titleRu ?? event.titleKk}` };
}

export default async function EventTicketsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;

  const event = await getPublicCultureEventBySlug(slug);
  if (!event) notFound();

  const backLink = (
    <Link
      href={`/afisha/${slug}`}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/70 hover:text-gold-dark transition-colors mb-6"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
      {locale === "kk" ? "Мероприятиеге оралу" : "Назад к мероприятию"}
    </Link>
  );

  if (!event.hallId) {
    return (
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            {backLink}
            <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8">
              <p className="text-ocean/70">
                {locale === "kk"
                  ? "Бұл іс-шараға билеттер қолжетімсіз."
                  : "Билеты для этого мероприятия недоступны."}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    );
  }

  const [seats, ticketTypes, takenSeatIds] = await Promise.all([
    listPublicHallSeats(event.hallId),
    listPublicEventTicketTypes(event.id),
    getTakenSeatIds(event.id),
  ]);

  const ticketTypeByCategory = new Map(ticketTypes.map((tt) => [tt.category, tt]));

  const rows: { label: string; seats: SeatOption[] }[] = [];
  for (const seat of seats) {
    const ticketType = ticketTypeByCategory.get(seat.category);
    const option: SeatOption = {
      id: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      category: seat.category,
      taken: takenSeatIds.has(seat.id),
      price: ticketType ? ticketType.price : null,
      isFree: ticketType?.isFree ?? false,
      ticketName: ticketType ? (localizedName(ticketType.nameKk, ticketType.nameRu, locale) ?? seat.category) : seat.category,
    };

    const current = rows[rows.length - 1];
    if (current && current.label === seat.rowLabel) current.seats.push(option);
    else rows.push({ label: seat.rowLabel, seats: [option] });
  }

  const eventTitle = event.titleRu ?? event.titleKk ?? "";

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>{backLink}</FadeIn>

        <FadeIn>
          <SectionTitle title={eventTitle} subtitle={locale === "kk" ? "Орынды таңдаңыз" : "Выберите места"} />
        </FadeIn>

        {rows.length === 0 ? (
          <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
            <p className="text-ocean/60">
              {locale === "kk" ? "Залда орындар әлі жоқ." : "В зале ещё нет мест."}
            </p>
          </div>
        ) : (
          <SeatPicker eventId={event.id} rows={rows} />
        )}
      </div>
    </section>
  );
}
