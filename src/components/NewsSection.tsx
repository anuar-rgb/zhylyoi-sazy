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
    news: { date: string; tag: string; title: string; excerpt: string; image: string; imagePosition?: string }[];
  }
> = {
  kk: {
    title: "Жаңалықтар",
    subtitle: "Мәдениет үйінің соңғы оқиғалары",
    more: "Толығырақ",
    news: [
      {
        date: "15 тамыз",
        tag: "Байқау",
        title: "«Жылыой сазы» облыстық байқауда жүлдегер атанды",
        excerpt:
          "Ансамбль мүшелері облыстық фольклорлық ұжымдар байқауында дипломмен марапатталды.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
      },
      {
        date: "28 шілде",
        tag: "Үйірме",
        title: "ИЗО және қолөнер үйірмесі жаңа топ жинайды",
        excerpt:
          "Балаларды сурет салу мен қолөнер негіздеріне үйрететін жаңа үйірмеге тіркеу басталды.",
        image: "https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg",
      },
      {
        date: "10 маусым",
        tag: "Іс-шара",
        title: "Мереке қарсаңында салтанатты концерт өтті",
        excerpt:
          "Мәдениет үйінің сахнасында ансамбльдер мен жеке орындаушылардың қатысуымен концерт ұйымдастырылды.",
        image: "/images/gallery/video-poster-concert.jpg",
      },
    ],
  },
  ru: {
    title: "Новости",
    subtitle: "Последние события Дома культуры",
    more: "Подробнее",
    news: [
      {
        date: "15 августа",
        tag: "Конкурс",
        title: "«Жылыой сазы» стал призёром областного конкурса",
        excerpt:
          "Участники ансамбля были награждены дипломом на областном конкурсе фольклорных коллективов.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
      },
      {
        date: "28 июля",
        tag: "Кружок",
        title: "Кружок ИЗО и творчества набирает новую группу",
        excerpt:
          "Открыта запись в новый кружок, где детей обучают основам рисования и декоративно-прикладного искусства.",
        image: "https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg",
      },
      {
        date: "10 июня",
        tag: "Мероприятие",
        title: "Прошёл праздничный концерт",
        excerpt:
          "На сцене Дома культуры выступили ансамбли и солисты в честь праздничного мероприятия.",
        image: "/images/gallery/video-poster-concert.jpg",
      },
    ],
  },
};

export default async function NewsSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section id="news" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {t.news.map((item, index) => (
            <FadeIn key={item.title} delay={index * 120}>
              <Link
                href="/contacts"
                className="group block bg-white rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ocean/5">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    style={item.imagePosition ? { objectPosition: item.imagePosition } : undefined}
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 bg-gold text-ocean-dark text-[11px] font-semibold px-2.5 py-1 rounded-full shadow">
                    {item.tag}
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-ocean/50 text-xs font-medium mb-1.5">{item.date}</p>
                  <h3 className="font-bold text-ocean text-base leading-snug mb-2">{item.title}</h3>
                  <p className="text-ocean/70 text-sm mb-3">{item.excerpt}</p>
                  <span className="text-sm font-semibold text-ocean group-hover:text-gold-dark transition-colors inline-flex items-center gap-1">
                    {t.more}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
