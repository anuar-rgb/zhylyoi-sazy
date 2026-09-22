import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { listPublicCultureNews } from "@/lib/cultureNews";
import { toNewsView } from "@/lib/newsView";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Жаңалықтар",
    description: "«Кең Жылыой» мәдениет үйінің соңғы жаңалықтары мен оқиғалары.",
  },
  ru: {
    title: "Новости",
    description: "Последние новости и события Дома культуры «Кен Жылыой».",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content: Record<Locale, { title: string; subtitle: string; more: string }> = {
  kk: {
    title: "Жаңалықтар",
    subtitle: "Мәдениет үйінің соңғы оқиғалары",
    more: "Толығырақ",
  },
  ru: {
    title: "Новости",
    subtitle: "Последние события Дома культуры",
    more: "Подробнее",
  },
};

export default async function NewsPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const allNews = (await listPublicCultureNews()).map((n) => toNewsView(n, locale));

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {allNews.map((item, index) => (
            <FadeIn key={item.id} delay={index * 100}>
              <Link
                href={`/news/${item.slug}`}
                className="group block bg-white rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ocean/5">
                  {/* News without a photo renders the placeholder background instead of crashing. */}
                  {item.images[0] && (
                    <Image
                      src={item.images[0]}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}
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
