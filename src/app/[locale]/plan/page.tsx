import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Даму жоспары 2026–2028",
    description:
      "«Жылыой сазы» ансамблінің 2026–2028 жылдарға арналған даму жоспары: репертуарды кеңейту, фестивальдерге қатысу, гастрольдер, авторлық шығармалар.",
  },
  ru: {
    title: "План развития 2026–2028",
    description:
      "План развития ансамбля «Жылыой сазы» на 2026–2028 годы: расширение репертуара, участие в фестивалях, гастроли, авторские произведения.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

export default async function PlanPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);

  // Six fixed slots, because the editable texts are a flat key/value store. A step
  // left blank in both languages drops out rather than drawing an empty card, so a
  // shorter plan is possible without touching this file.
  const steps = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      year: text(`planPage.step${n}Year`),
      title: text(`planPage.step${n}Title`),
      description: text(`planPage.step${n}Text`),
    }))
    .filter((step) => step.title || step.description);

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("planPage.title")} subtitle={text("planPage.subtitle")} />
        </FadeIn>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-ocean via-gold to-ocean/30" />

          <div className="space-y-0">
            {steps.map((item, index) => (
              <FadeIn key={index} delay={index * 100}>
              <div className="relative pl-16 sm:pl-20 pb-10 last:pb-0 group">
                {/* Circle on line */}
                <div className="absolute left-0 sm:left-2 w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-white border-4 border-ocean flex items-center justify-center z-10 group-hover:border-gold group-hover:scale-110 transition-all">
                  <span className="font-bold text-ocean text-lg group-hover:text-gold transition-colors">
                    {index + 1}
                  </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-cream-dark p-6 hover:shadow-md hover:border-gold/40 transition-all">
                  {/* Year badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-cream bg-ocean px-3 py-1 rounded-full">
                      {item.year}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-ocean mb-2">{item.title}</h3>
                  <p className="text-ocean/60 leading-relaxed">{item.description}</p>
                </div>
              </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <FadeIn>
        <div className="mt-10 sm:mt-14 bg-gradient-to-br from-ocean to-ocean-dark rounded-3xl p-6 sm:p-8 lg:p-10 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4">{text("planPage.strategicTitle")}</h3>
          <p className="text-cream/80 text-lg leading-relaxed max-w-2xl mx-auto">
            {text("planPage.strategicText")}
          </p>
        </div>
        </FadeIn>
      </div>
    </section>
  );
}
