import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Репертуар",
    description:
      "«Жылыой сазы» ансамблінің репертуары — 10 шығарма: халық әндері, күйлер, терме, авторлық туындылар және әлемдік классика.",
  },
  ru: {
    title: "Репертуар",
    description:
      "Репертуар ансамбля «Жылыой сазы» — 10 произведений: народные песни, кюи, терме, авторские произведения и мировая классика.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const repertoireKk = [
  { num: 1, title: "Комсомол", author: "Тоқсанбай Құлтумиев", note: "Өңдеген: Бауыржан Ақтаев", tag: "Күй" },
  { num: 2, title: "Самғау", author: "Темірлан Шөкенов", note: null, tag: "Күй" },
  { num: 3, title: "Құралай", author: "Халық әні", note: null, tag: "Халық әні" },
  { num: 4, title: "Шахристан", author: "Марат Бердыгулов", note: null, tag: "Күй" },
  { num: 5, title: "Көк шолақ", author: "Кенен Әзірбаев", note: null, tag: "Ән" },
  { num: 6, title: "Токкато", author: "Поль Мориа", note: null, tag: "Классика" },
  { num: 7, title: "Сүгірдің термесі", author: "Дәстүрлі терме", note: null, tag: "Терме" },
  { num: 8, title: "Рухани тербеліс", author: "Темірлан Шөкенов", note: null, tag: "Күй" },
  { num: 9, title: "Көк бөрі", author: "Алпысбек Оңайбайұлы", note: "Сөзі: Данияр Алдаберген", tag: "Ән" },
  { num: 10, title: "Ұлы дала сазы", author: "Алишер Лапишев", note: "Авторлық күй", tag: "Авторлық" },
];

const repertoireRu = [
  { num: 1, title: "Комсомол", author: "Токсанбай Култумиев", note: "Обработка: Бауыржан Актаев", tag: "Кюй" },
  { num: 2, title: "Самғау", author: "Темирлан Шокенов", note: null, tag: "Кюй" },
  { num: 3, title: "Құралай", author: "Народная песня", note: null, tag: "Народная песня" },
  { num: 4, title: "Шахристан", author: "Марат Бердыгулов", note: null, tag: "Кюй" },
  { num: 5, title: "Көк шолақ", author: "Кенен Азербаев", note: null, tag: "Песня" },
  { num: 6, title: "Токката", author: "Поль Мориа", note: null, tag: "Классика" },
  { num: 7, title: "Терме Сугира", author: "Традиционная терме", note: null, tag: "Терме" },
  { num: 8, title: "Рухани тербеліс", author: "Темирлан Шокенов", note: null, tag: "Кюй" },
  { num: 9, title: "Көк бөрі", author: "Алпысбек Онайбайулы", note: "Слова: Данияр Алдаберген", tag: "Песня" },
  { num: 10, title: "Ұлы дала сазы", author: "Алишер Лапишев", note: "Авторский кюй", tag: "Авторская" },
];

const content = {
  kk: {
    title: "Репертуар",
    subtitle: "Халық әндері мен күйлері, дәстүрлі шығармалар, авторлық туындылар және әлемдік классика",
    total: "Барлығы",
    footer: "Репертуар үнемі жаңартылып, толықтырылып отырады",
    items: repertoireKk,
  },
  ru: {
    title: "Репертуар",
    subtitle: "Народные песни и кюи, традиционные произведения, авторские сочинения и мировая классика",
    total: "Всего",
    footer: "Репертуар регулярно обновляется и пополняется",
    items: repertoireRu,
  },
} satisfies Record<Locale, unknown>;

const tagColors: Record<string, string> = {
  "Күй": "bg-gold/15 text-gold-dark border-gold/30",
  "Кюй": "bg-gold/15 text-gold-dark border-gold/30",
  "Халық әні": "bg-ocean/10 text-ocean border-ocean/20",
  "Народная песня": "bg-ocean/10 text-ocean border-ocean/20",
  "Ән": "bg-ocean/10 text-ocean border-ocean/20",
  "Песня": "bg-ocean/10 text-ocean border-ocean/20",
  "Классика": "bg-blue-50 text-blue-700 border-blue-200",
  "Терме": "bg-amber-50 text-amber-700 border-amber-200",
  "Авторлық": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Авторская": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default async function RepertoirePage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {t.items.map((item) => (
            <FadeIn key={item.num} delay={((item.num - 1) % 3) * 100}>
            <div
              className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              <div className="p-6">
                {/* Number + tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className="w-9 h-9 bg-ocean rounded-full flex items-center justify-center text-cream font-bold text-sm">
                    {item.num}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tagColors[item.tag]}`}>
                    {item.tag}
                  </span>
                </div>

                {/* Music icon */}
                <div className="mb-3">
                  <svg className="w-8 h-8 text-gold/60 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-ocean mb-1 leading-tight">
                  «{item.title}»
                </h3>

                {/* Author */}
                <p className="text-ocean/60 text-sm">{item.author}</p>

                {/* Note */}
                {item.note && (
                  <p className="mt-2 text-xs text-gold-dark bg-gold/10 inline-block px-2.5 py-1 rounded-full">
                    {item.note}
                  </p>
                )}
              </div>

              {/* Bottom accent */}
              <div className="h-1 bg-gradient-to-r from-ocean via-gold to-ocean opacity-20 group-hover:opacity-60 transition-opacity" />
            </div>
            </FadeIn>
          ))}
        </div>

        {/* Summary */}
        <FadeIn>
        <div className="mt-8 sm:mt-12 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            {Object.entries(
              t.items.reduce<Record<string, number>>((acc, item) => {
                acc[item.tag] = (acc[item.tag] || 0) + 1;
                return acc;
              }, {})
            ).map(([tag, count]) => (
              <div key={tag} className="px-4">
                <div className="text-2xl font-bold text-ocean">{count}</div>
                <div className="text-sm text-ocean/50">{tag}</div>
              </div>
            ))}
            <div className="px-4 border-l-2 border-gold/30">
              <div className="text-2xl font-bold text-gold-dark">{t.items.length}</div>
              <div className="text-sm text-ocean/50">{t.total}</div>
            </div>
          </div>
        </div>

        </FadeIn>
        <div className="mt-4 sm:mt-6 text-center text-ocean/50 text-sm">
          {t.footer}
        </div>
      </div>
    </section>
  );
}
