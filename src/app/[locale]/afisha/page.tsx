import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { events } from "@/data/events";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Афиша",
    description: "«Кең Жылыой» мәдениет үйінің жақын арадағы концерттері, спектакльдері мен көрмелері.",
  },
  ru: {
    title: "Афиша",
    description: "Ближайшие концерты, спектакли и выставки Дома культуры «Кен Жылыой».",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content: Record<Locale, { title: string; subtitle: string; more: string }> = {
  kk: {
    title: "Афиша",
    subtitle: "Мәдениет үйінің жақын арадағы іс-шаралары",
    more: "Толығырақ",
  },
  ru: {
    title: "Афиша",
    subtitle: "Ближайшие мероприятия Дома культуры",
    more: "Подробнее",
  },
};

export default async function AfishaPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const allEvents = events[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {allEvents.map((event, index) => (
            <FadeIn key={event.slug} delay={index * 100}>
              <div className="group bg-cream/40 rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
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
                  <Link
                    href={`/afisha/${event.slug}`}
                    className="btn-primary inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
                  >
                    {t.more}
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
