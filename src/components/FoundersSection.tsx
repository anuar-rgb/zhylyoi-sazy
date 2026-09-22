import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

export default async function FoundersSection() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const orgs = [
    { name: text("founders.org1Name"), role: text("founders.org1Role") },
    { name: text("founders.org2Name"), role: text("founders.org2Role") },
  ];

  return (
    <section className="py-10 sm:py-12 bg-white border-t border-cream-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-ocean/50 text-xs font-semibold uppercase tracking-wide mb-6">
            {text("founders.eyebrow")}
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {orgs.map((org, index) => (
            <FadeIn key={org.name} delay={index * 100}>
              <div className="flex items-center gap-4 h-full bg-cream/40 border border-cream-dark rounded-3xl px-5 py-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-ocean/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-ocean font-semibold text-sm leading-snug">{org.name}</p>
                  <p className="text-ocean/50 text-xs mt-0.5">{org.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
