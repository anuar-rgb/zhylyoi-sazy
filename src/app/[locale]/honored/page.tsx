import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Халықтық үлгілі атағы бар ұжымдар",
    description:
      "«Кең Жылыой» мәдениет үйінің халықтық үлгідегі атаққа ие шығармашылық ұжымдары — «Жылыой сазы» фольклорлық ансамблі.",
  },
  ru: {
    title: "Коллективы со званием «Народный»",
    description:
      "Коллективы Дома культуры «Кен Жылыой», удостоенные почётного звания «Народный» — фольклорный ансамбль «Жылыой сазы».",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content = {
  kk: {
    title: "Халықтық үлгілі атағы бар ұжымдар",
    subtitle: "Мәдениет үйінің құрметті атаққа ие шығармашылық ұжымдары",
    intro:
      "«Халықтық» (үлгілі) атағы — көркемдік деңгейі жоғары, тұрақты шығармашылық жұмыс жүргізетін әуесқой өнер ұжымдарына берілетін құрметті атақ. Бұл атаққа ие ұжым өз деңгейін үнемі растап, аудандық, облыстық және республикалық іс-шараларда өңірді лайықты таныстырады. Төменде «Кең Жылыой» мәдениет үйінің осындай құрметті атаққа ие ұжымы берілген.",
    badge: "Халықтық үлгідегі ұжым",
    cardTitle: "«Жылыой сазы» фольклорлық ансамблі",
    cardDescription:
      "Қазақ халқының дәстүрлі музыкалық мұрасын сақтау мен насихаттауға арналған, 18 кәсіби өнерпаздан құралған ұжым. Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда орындайды.",
    more: "Ұжым туралы толығырақ",
    note: "Ескерту: атаққа қатысты нақты бұйрық/куәлік деректері мекеме тарапынан нақтыланғаннан кейін толықтырылады.",
  },
  ru: {
    title: "Коллективы со званием «Народный»",
    subtitle: "Творческие коллективы Дома культуры, удостоенные почётного звания",
    intro:
      "Звание «Народный» (образцовый) присваивается любительским творческим коллективам с высоким художественным уровнем и стабильной творческой работой. Коллектив, удостоенный этого звания, регулярно подтверждает свой уровень и достойно представляет район на областных и республиканских мероприятиях. Ниже — коллектив Дома культуры «Кен Жылыой», удостоенный этого почётного звания.",
    badge: "Коллектив со званием «Народный»",
    cardTitle: "Фольклорный ансамбль «Жылыой сазы»",
    cardDescription:
      "Коллектив из 18 профессиональных артистов, посвящённый сохранению и популяризации традиционного музыкального наследия казахского народа. Исполняет произведения на домбре, кобызе, шертере и других национальных инструментах.",
    more: "Подробнее о коллективе",
    note: "Примечание: точные данные о приказе/удостоверении о присвоении звания будут добавлены после уточнения учреждением.",
  },
} satisfies Record<Locale, unknown>;

export default async function HonoredPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <FadeIn>
          <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
            {t.intro}
          </p>
        </FadeIn>

        <FadeIn>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-cream-dark">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="relative aspect-[4/3] sm:aspect-auto">
                <Image
                  src="/images/gallery/ensemble-photo.jpeg"
                  alt={t.cardTitle}
                  fill
                  className="object-cover"
                  style={{ objectPosition: "top" }}
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-6 sm:p-8 flex flex-col">
                <span className="self-start bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  {t.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-3 leading-tight">{t.cardTitle}</h2>
                <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-6 flex-1">{t.cardDescription}</p>
                <Link
                  href="/collectives"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-ocean text-cream text-sm font-semibold rounded-lg hover:bg-ocean-light active:scale-95 transition-all self-start"
                >
                  {t.more}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <p className="mt-6 text-xs text-ocean/40 text-center italic">{t.note}</p>
        </FadeIn>
      </div>
    </section>
  );
}
