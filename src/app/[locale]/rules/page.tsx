import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getSiteText } from "@/lib/orgContent";
import { RulesText, VISIT_RULES_TEXT } from "@/components/VisitRules";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return { title: VISIT_RULES_TEXT[locale].title };
}

/**
 * The institution's visiting rules for its events, which a buyer accepts together with the offer.
 * The text is the institution's own (Тексты сайта → Правила посещения), not a platform document.
 */
export default async function RulesPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-3xl border border-cream-dark shadow-sm px-5 py-7 sm:px-10 sm:py-10 text-ocean/80">
          <h1 className="text-center text-xl sm:text-2xl font-bold text-ocean mb-8">{VISIT_RULES_TEXT[locale].title}</h1>
          <RulesText text={text("visitRules.text")} className="space-y-3 text-sm sm:text-[15px] leading-relaxed" />
        </article>
      </div>
    </section>
  );
}
