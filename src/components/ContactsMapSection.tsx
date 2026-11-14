import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { getSiteOrganization, localizedOrganization } from "@/lib/organization";
import { telHref } from "@/lib/contactLinks";
import { getSiteText } from "@/lib/orgContent";
import { mapsLink, osmEmbedUrl } from "@/lib/mapPoint";
import SectionTitle from "@/components/SectionTitle";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    hours: string;
    lunch: string;
    contactBtn: string;
    mapTitle: string;
    openInGoogle: string;
  }
> = {
  kk: {
    title: "Контакты",
    subtitle: "Бізді табу оңай",
    hours: "Дүйсенбі – Жұма: 09:00 – 18:30",
    lunch: "Түскі үзіліс: 13:00 – 14:30",
    contactBtn: "Байланысу",
    mapTitle: "Мекенжай картада",
    openInGoogle: "Google Картадан ашу",
  },
  ru: {
    title: "Контакты",
    subtitle: "Нас легко найти",
    hours: "Понедельник – Пятница: 09:00 – 18:30",
    lunch: "Обеденный перерыв: 13:00 – 14:30",
    contactBtn: "Связаться",
    mapTitle: "Адрес на карте",
    openInGoogle: "Открыть в Google Картах",
  },
};

export default async function ContactsMapSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  // Address and phone come from the institution card; the working hours come from
  // the editable texts. Both reach this block from the admin panel.
  const text = await getSiteText(locale);
  const organization = await getSiteOrganization();
  // The institution's own address from its card; a dash until it is filled in, never another's.
  const address = (organization && localizedOrganization(organization, locale, "address")) ?? "—";
  // The map point is set in Админка → Настройки; without one the block shows only the details.
  const point = organization?.mapPoint ?? null;

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          <FadeIn className={point ? "lg:col-span-2" : "lg:col-span-5"}>
            <div className="bg-cream/40 rounded-3xl p-6 sm:p-8 border border-cream-dark h-full flex flex-col">
              <ul className="space-y-5 text-sm sm:text-base flex-1">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-ocean/80 whitespace-pre-line">{address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {organization?.phone ? (
                    <a href={telHref(organization.phone)} className="text-ocean/80 hover:text-gold-dark transition-colors">
                      {organization.phone}
                    </a>
                  ) : (
                    <span className="text-ocean/80">—</span>
                  )}
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-ocean/80">
                    {text("contacts.hours")}
                    <br />
                    {text("contacts.lunch")}
                  </span>
                </li>
              </ul>

              <Link
                href="/contacts"
                className="btn-primary mt-6 inline-flex items-center justify-center px-6 py-3 font-semibold"
              >
                {t.contactBtn}
              </Link>
            </div>
          </FadeIn>

          {point && (
          <FadeIn delay={150} className="lg:col-span-3">
            <div className="relative rounded-3xl overflow-hidden border border-cream-dark shadow-sm h-80 lg:h-full min-h-80">
              <iframe
                title={t.mapTitle}
                src={osmEmbedUrl(point)}
                className="w-full h-full"
                loading="lazy"
              />
              <a
                href={mapsLink(point, null) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary absolute bottom-3 right-3 text-xs sm:text-sm font-semibold px-3 py-2"
              >
                {t.openInGoogle}
              </a>
            </div>
          </FadeIn>
          )}
        </div>
      </div>
    </section>
  );
}
