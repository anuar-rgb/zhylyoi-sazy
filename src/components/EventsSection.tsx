import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import { listPublicCultureEvents } from "@/lib/cultureEvents";
import { toEventView } from "@/lib/eventView";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  { title: string; subtitle: string; more: string; seeAll: string }
> = {
  kk: {
    title: "Афиша",
    subtitle: "Жақын арадағы іс-шаралар",
    more: "Толығырақ",
    seeAll: "Барлық іс-шаралар",
  },
  ru: {
    title: "Афиша",
    subtitle: "Ближайшие мероприятия",
    more: "Подробнее",
    seeAll: "Все мероприятия",
  },
};

export default async function EventsSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const text = await getSiteText(locale);
  // Ближайшие три: DAL отдаёт по возрастанию даты.
  const featuredEvents = (await listPublicCultureEvents()).slice(0, 3).map((e) => toEventView(e, locale));

  return (
    <section id="afisha" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("events.title")} subtitle={text("events.subtitle")} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredEvents.map((event, index) => (
            <FadeIn key={event.id} delay={index * 120}>
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
                  <p className="text-ocean/70 text-sm mb-4 flex-1">{event.description}</p>
                  {/* An event with no address has no page of its own, so it is shown without a link. */}
                  {event.slug && (
                    <Link
                      href={`/afisha/${event.slug}`}
                      className="btn-primary inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
                    >
                      {t.more}
                    </Link>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={featuredEvents.length * 120}>
          <div className="mt-8 sm:mt-10 text-center">
            <Link
              href="/afisha"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-gold-dark transition-colors"
            >
              {t.seeAll}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
