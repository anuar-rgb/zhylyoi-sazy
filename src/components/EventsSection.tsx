import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    more: string;
    events: { date: string; time: string; title: string; description: string; image: string }[];
  }
> = {
  kk: {
    title: "Афиша",
    subtitle: "Жақын арадағы іс-шаралар",
    more: "Толығырақ",
    events: [
      {
        date: "20 қыркүйек",
        time: "19:00",
        title: "Мерекелік концерт",
        description: "Қазақ халық әндері мен күйлерінің кеші, ұлттық аспаптар сүйемелдеуімен",
        image: "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg",
      },
      {
        date: "4 қазан",
        time: "18:00",
        title: "Балалар театр спектаклі",
        description: "Ауданның жас көрермендеріне арналған қойылым",
        image: "https://images.pexels.com/photos/6896181/pexels-photo-6896181.jpeg",
      },
      {
        date: "15 қазан",
        time: "11:00",
        title: "Қолөнер және сурет көрмесі",
        description: "Өңір шеберлері мен балалар шығармашылық үйірмелерінің жұмыстары",
        image: "https://images.pexels.com/photos/2559741/pexels-photo-2559741.jpeg",
      },
    ],
  },
  ru: {
    title: "Афиша",
    subtitle: "Ближайшие мероприятия",
    more: "Подробнее",
    events: [
      {
        date: "20 сентября",
        time: "19:00",
        title: "Праздничный концерт",
        description: "Вечер казахских народных песен и кюев в сопровождении национальных инструментов",
        image: "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg",
      },
      {
        date: "4 октября",
        time: "18:00",
        title: "Детский театральный спектакль",
        description: "Постановка для юных зрителей района",
        image: "https://images.pexels.com/photos/6896181/pexels-photo-6896181.jpeg",
      },
      {
        date: "15 октября",
        time: "11:00",
        title: "Выставка декоративно-прикладного искусства",
        description: "Работы мастеров региона и детских творческих кружков",
        image: "https://images.pexels.com/photos/2559741/pexels-photo-2559741.jpeg",
      },
    ],
  },
};

export default async function EventsSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section id="afisha" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {t.events.map((event, index) => (
            <FadeIn key={event.title} delay={index * 120}>
              <div className="group bg-cream/40 rounded-xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 bg-ocean text-cream text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg shadow">
                    {event.date}
                  </div>
                  <div className="absolute top-3 right-3 bg-gold text-ocean text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg shadow">
                    {event.time}
                  </div>
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-ocean text-lg mb-2">{event.title}</h3>
                  <p className="text-ocean/70 text-sm mb-4 flex-1">{event.description}</p>
                  <Link
                    href="/contacts"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-ocean text-cream text-sm font-semibold rounded-lg hover:bg-ocean-light active:scale-95 transition-all"
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
