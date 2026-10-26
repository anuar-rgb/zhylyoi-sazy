import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

// Metadata stays in the file on purpose: generateMetadata runs before the page and
// would need its own database read, and a search engine seeing last week's wording
// for a day costs nothing. The visible page is what an administrator edits.
const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Ансамбль туралы",
    description:
      "«Жылыой сазы» фольклорлық ансамблі 2026 жылы «Кең Жылыой» мәдениет үйінде құрылды. 18 кәсіби өнерпаз. Қазақ халқының дәстүрлі музыкалық мұрасын насихаттау.",
  },
  ru: {
    title: "Об ансамбле",
    description:
      "Фольклорный ансамбль «Жылыой сазы» создан в 2026 году при доме культуры «Кен Жылыой». 18 профессиональных артистов. Популяризация традиционного музыкального наследия казахского народа.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

export default async function AboutPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);

  // Built from numbered keys rather than a list, because the editable texts are a
  // flat key/value store: a fixed number of slots is what that buys. Empty ones are
  // dropped so a slot left blank renders nothing instead of an empty card.
  const sections = [1, 2, 3, 4]
    .map((n) => ({ heading: text(`aboutPage.section${n}Heading`), body: text(`aboutPage.section${n}Text`) }))
    .filter((s) => s.heading || s.body);

  const directions = [1, 2, 3, 4, 5].map((n) => text(`aboutPage.direction${n}`)).filter(Boolean);

  const stats = [1, 2, 3]
    .map((n) => ({ value: text(`aboutPage.stat${n}Value`), label: text(`aboutPage.stat${n}Label`) }))
    .filter((s) => s.value || s.label);

  const quote = text("aboutPage.quote");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("aboutPage.title")} subtitle={text("aboutPage.subtitle")} />
        </FadeIn>

        <div className="space-y-5 sm:space-y-6 text-ocean/80">
          {sections.map((s, index) => (
            <FadeIn key={index}>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
                <h3 className="text-lg sm:text-xl font-bold text-ocean mb-3 sm:mb-4">{s.heading}</h3>
                <p className="leading-relaxed text-sm sm:text-base">{s.body}</p>
              </div>
            </FadeIn>
          ))}

          {directions.length > 0 && (
            <FadeIn>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
                <h3 className="text-lg sm:text-xl font-bold text-ocean mb-3 sm:mb-4">
                  {text("aboutPage.directionsTitle")}
                </h3>
                <ul className="space-y-3 text-sm sm:text-base">
                  {directions.map((d, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          )}

          {stats.length > 0 && (
            <FadeIn>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {stats.map((s, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-cream-dark text-center"
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-ocean">{s.value}</div>
                    <div className="text-xs sm:text-sm text-ocean/60 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {quote && (
            <FadeIn>
              <div className="bg-ocean/5 rounded-3xl p-6 sm:p-8">
                <blockquote className="text-center italic text-ocean text-base sm:text-lg leading-relaxed">
                  {quote}
                </blockquote>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </section>
  );
}
