import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import { getSiteOrganization, localizedOrganization } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

/**
 * The institution's registered full name and its founder, names only, from the institution card
 * (Админка → Настройки → Официальные реквизиты), the same values as on Contacts.
 */
export default async function FoundersSection() {
  const locale = (await getLocale()) as Locale;
  const organization = await getSiteOrganization();
  const names = organization
    ? [localizedOrganization(organization, locale, "legalName"), localizedOrganization(organization, locale, "founder")].filter(
        (name): name is string => Boolean(name)
      )
    : [];
  if (names.length === 0) return null;

  return (
    <section className="py-10 sm:py-12 bg-white border-t border-cream-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 mx-auto ${names.length > 1 ? "sm:grid-cols-2 max-w-4xl" : "max-w-xl"}`}>
          {names.map((name, index) => (
            <FadeIn key={name} delay={index * 100}>
              <div className="flex items-center gap-4 h-full bg-cream/40 border border-cream-dark rounded-3xl px-5 py-4">
                <div className="shrink-0 w-11 h-11 rounded-full bg-ocean/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
                  </svg>
                </div>
                <p className="text-ocean font-semibold text-sm leading-snug">{name}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
