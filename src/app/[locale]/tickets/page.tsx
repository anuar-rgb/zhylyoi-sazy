import type { Metadata } from "next";
import { institutionPageMetadata, type PageMeta } from "@/lib/pageMetadata";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { listPublicTicketedCultureEvents } from "@/lib/cultureEvents";
import { listPublicEventTicketTypesForEvents, summarizePriceRange, type PriceRange } from "@/lib/eventTicketTypes";
import { toEventView } from "@/lib/eventView";
import MyTickets from "./MyTickets";
import type { Locale } from "@/i18n/routing";

const meta: PageMeta = {
  kk: { title: "Билеттер", description: (name) => `${name}: билеттері сатылатын іс-шаралар.` },
  ru: { title: "Билеты", description: (name) => `Мероприятия с продажей билетов — ${name}.` },
};

const content: Record<
  Locale,
  { title: string; subtitle: string; buy: string; emptyState: string; free: string; cancelled: string; details: string; moved: string }
> = {
  kk: {
    title: "Билеттер",
    subtitle: "Орындарды таңдап, билетті бірден сатып алыңыз",
    buy: "Билет сатып алу",
    emptyState: "Қазір билеті сатылатын іс-шаралар жоқ.",
    free: "Тегін",
    cancelled: "Болдырылмады",
    details: "Толығырақ",
    moved: "Ауыстырылды",
  },
  ru: {
    title: "Билеты",
    subtitle: "Выберите места и купите билет онлайн",
    buy: "Купить билет",
    emptyState: "Сейчас нет мероприятий с продажей билетов.",
    free: "Бесплатно",
    cancelled: "Отменено",
    details: "Подробнее",
    moved: "Перенесено",
  },
};

function priceLabel(range: PriceRange, locale: Locale, freeLabel: string): string | null {
  if (range.kind === "unknown") return null;
  if (range.kind === "free") return freeLabel;
  const suffix = locale === "kk" ? "теңге" : "₸";
  return range.min === range.max
    ? `${range.min} ${suffix}`
    : locale === "kk"
      ? `${range.min} ${suffix}-ден`
      : `от ${range.min} ${suffix}`;
}

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata(meta);
}

export default async function TicketsPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  const records = (await listPublicTicketedCultureEvents()).filter((event) => event.slug !== null);
  const ticketTypesByEvent = await listPublicEventTicketTypesForEvents(records.map((event) => event.id));

  const events = records.map((record) => ({
    ...toEventView(record, locale),
    price: priceLabel(summarizePriceRange(ticketTypesByEvent.get(record.id) ?? []), locale, t.free),
    cancelled: Boolean(record.cancelledAt),
    moved: Boolean(record.movedFrom),
  }));

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <MyTickets />

        {events.length === 0 ? (
          <p className="text-center text-ocean/60 py-16">{t.emptyState}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {events.map((event, index) => (
              <FadeIn key={event.id} delay={index * 100}>
                <div className="group bg-cream/40 rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-ocean/5">
                    {event.image && (
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                    <div className="absolute top-3 left-3 bg-ocean text-cream text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                      {event.date}
                    </div>
                    <div className="absolute top-3 right-3 bg-gold text-ocean text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                      {event.time}
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-ocean text-lg mb-2">{event.title}</h3>
                    {event.cancelled ? (
                      <p className="mb-4">
                        <span className="inline-block bg-red-50 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">{t.cancelled}</span>
                      </p>
                    ) : (
                      <>
                        {event.moved && (
                          <p className="mb-2">
                            <span className="inline-block bg-gold/15 text-ocean-dark text-xs font-semibold px-3 py-1 rounded-full">{t.moved}</span>
                          </p>
                        )}
                        {event.price && <p className="text-ocean/70 text-sm font-semibold mb-4">{event.price}</p>}
                      </>
                    )}
                    {event.cancelled ? (
                      <Link
                        href={`/afisha/${event.slug}`}
                        className="mt-auto inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-[20px] border-2 border-ocean/20 text-ocean hover:border-ocean/40 hover:bg-cream/50 transition-colors"
                      >
                        {t.details}
                      </Link>
                    ) : (
                      <Link
                        href={`/afisha/${event.slug}/tickets`}
                        className="btn-primary mt-auto inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
                      >
                        {t.buy}
                      </Link>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
