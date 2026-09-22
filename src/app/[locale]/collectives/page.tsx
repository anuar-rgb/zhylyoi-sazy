import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { listPublicClubs, localized } from "@/lib/clubs";
import { content as teatrContent, posters as teatrPosters } from "@/data/teatr";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Ұжымдар",
    description:
      "«Кең Жылыой» мәдениет үйінде жұмыс істейтін шығармашылық ұжымдар: «Жылыой сазы» фольклорлық ансамблі, би, вокал, театр және ИЗО үйірмелері.",
  },
  ru: {
    title: "Коллективы",
    description:
      "Творческие коллективы Дома культуры «Кен Жылыой»: фольклорный ансамбль «Жылыой сазы», танцевальный, вокальный, театральный и ИЗО кружки.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const repertoirePreviewKk = ["Комсомол", "Самғау", "Құралай", "Көк бөрі", "Ұлы дала сазы"];
const repertoirePreviewRu = ["Комсомол", "Самғау", "Құралай", "Көк бөрі", "Ұлы дала сазы"];

const content = {
  kk: {
    title: "Ұжымдар",
    subtitle: "Мәдениет үйінде жұмыс істейтін шығармашылық ұжымдар мен үйірмелер",
    flagship: {
      badge: "Халықтық үлгідегі ұжым",
      title: "«Жылыой сазы» фольклорлық ансамблі",
      description:
        "Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда ойнауды үйретеді. Ансамбль құрамында 18 кәсіби өнерпаз қызмет етеді.",
      stats: [
        { value: "18", label: "Кәсіби өнерпаз" },
        { value: "10+", label: "Репертуардағы туынды" },
        { value: "2026", label: "Құрылған жылы" },
      ],
      repertoireLabel: "Репертуардан үзінді",
      repertoireLink: "Толық репертуар",
      membersLink: "Толық құрамы",
      historyLink: "Толық тарихы",
      honoredLink: "Халықтық атақ туралы",
      repertoire: repertoirePreviewKk,
    },
    othersTitle: "Басқа да үйірмелер",
    infoLabel: "Ақпарат алу",
  },
  ru: {
    title: "Коллективы",
    subtitle: "Творческие коллективы и кружки Дома культуры",
    flagship: {
      badge: "Коллектив со званием «Народный»",
      title: "Фольклорный ансамбль «Жылыой сазы»",
      description:
        "Обучение игре на домбре, кобызе, шертере и других национальных инструментах. В составе ансамбля работают 18 профессиональных артистов.",
      stats: [
        { value: "18", label: "Профессиональных артистов" },
        { value: "10+", label: "Произведений в репертуаре" },
        { value: "2026", label: "Год основания" },
      ],
      repertoireLabel: "Из репертуара",
      repertoireLink: "Весь репертуар",
      membersLink: "Весь состав",
      historyLink: "Полная история",
      honoredLink: "О звании «Народный»",
      repertoire: repertoirePreviewRu,
    },
    othersTitle: "Другие кружки",
    infoLabel: "Узнать больше",
  },
} satisfies Record<Locale, unknown>;

export default async function CollectivesPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const f = t.flagship;
  const others = await listPublicClubs("club");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        {/* Flagship: Zhylyoi sazy */}
        <FadeIn>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-cream-dark mb-10 sm:mb-14">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-[4/3] lg:aspect-auto">
                <Image
                  src="/images/gallery/ensemble-photo.jpeg"
                  alt={f.title}
                  fill
                  className="object-cover"
                  style={{ objectPosition: "top" }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
                <span className="self-start bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  {f.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-ocean mb-3 leading-tight">{f.title}</h2>
                <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-6">{f.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {f.stats.map((s) => (
                    <div key={s.label} className="text-center bg-cream/50 rounded-3xl py-3 px-2">
                      <div className="text-xl sm:text-2xl font-bold text-ocean">{s.value}</div>
                      <div className="text-[11px] sm:text-xs text-ocean/50 mt-0.5 leading-snug">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ocean/40 mb-2.5">
                    {f.repertoireLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {f.repertoire.map((piece) => (
                      <span
                        key={piece}
                        className="text-xs sm:text-sm font-medium text-ocean bg-ocean/8 border border-ocean/15 rounded-full px-3 py-1.5"
                      >
                        «{piece}»
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  <Link
                    href="/repertoire"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ocean hover:text-gold-dark transition-colors"
                  >
                    {f.repertoireLink}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/members"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ocean hover:text-gold-dark transition-colors"
                  >
                    {f.membersLink}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-ocean hover:text-gold-dark transition-colors"
                  >
                    {f.historyLink}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/honored"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-gold-dark hover:text-ocean transition-colors"
                  >
                    {f.honoredLink}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Second collective holding the "Народный" title, alongside the ensemble above */}
        <FadeIn>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-cream-dark mb-12 sm:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[260px]">
                <Image
                  src={teatrPosters[3].src}
                  alt={teatrContent[locale].title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-6 sm:p-8 flex flex-col">
                <span className="self-start bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  {teatrContent[locale].badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-ocean mb-3 leading-tight">
                  {teatrContent[locale].title}
                </h3>
                <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-6 flex-1">
                  {teatrContent[locale].lead}
                </p>
                <Link
                  href="/collectives/zhastar"
                  className="btn-primary inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold self-start"
                >
                  {t.infoLabel}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Other collectives */}
        <FadeIn>
          <h3 className="text-xl sm:text-2xl font-bold text-ocean mb-6">{t.othersTitle}</h3>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {others.map((club, index) => {
            const title = localized(club, locale, "name") ?? "";
            const description = localized(club, locale, "description");
            const cover = club.images[0]?.url;

            return (
              <FadeIn key={club.id} delay={index * 100}>
                <div className="group bg-white rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-ocean/5">
                    {cover && (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <h4 className="font-bold text-ocean text-base mb-2 leading-tight">{title}</h4>
                    {description && <p className="text-ocean/70 text-sm mb-4 flex-1">{description}</p>}
                    {/* A club without an address has no page of its own, so it is shown without a link. */}
                    {club.slug && (
                      <Link
                        href={`/clubs/${club.slug}`}
                        className="text-sm font-semibold text-ocean hover:text-gold-dark transition-colors inline-flex items-center gap-1 mt-auto"
                      >
                        {t.infoLabel}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
