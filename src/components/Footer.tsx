import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteOrganization, localizedOrganization, siteBrand } from "@/lib/organization";
import OrgLogo from "@/components/OrgLogo";
import { telHref } from "@/lib/contactLinks";
import { LEGAL_DOCS } from "@/lib/legalDocs";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    navTitle: string;
    nav: { href: string; label: string }[];
    contactsTitle: string;
    phoneLabel: string;
  }
> = {
  kk: {
    navTitle: "Навигация",
    nav: [
      { href: "/honored", label: "Халықтық үлгілі атағы бар ұжымдар" },
      { href: "/collectives", label: "Ұжымдар" },
      { href: "/afisha", label: "Афиша" },
      { href: "/video", label: "Бейне" },
      { href: "/contacts", label: "Байланыс" },
    ],
    contactsTitle: "Байланыс",
    phoneLabel: "Тел",
  },
  ru: {
    navTitle: "Навигация",
    nav: [
      { href: "/honored", label: "Коллективы со званием «Народный»" },
      { href: "/collectives", label: "Коллективы" },
      { href: "/afisha", label: "Афиша" },
      { href: "/video", label: "Видео" },
      { href: "/contacts", label: "Контакты" },
    ],
    contactsTitle: "Контакты",
    phoneLabel: "Тел",
  },
};

export default async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  // Контакты берутся из карточки учреждения, чтобы правка в админке доходила
  // до подвала на каждой странице.
  const organization = await getSiteOrganization();
  const address = organization ? localizedOrganization(organization, locale, "address") : null;
  const region = organization ? localizedOrganization(organization, locale, "regionLabel") : null;
  // The layout shows «Сайт не найден» instead of the footer when there is no institution.
  const brand = organization ? siteBrand(organization, locale) : { name: "", fullName: "", tagline: "", logoUrl: null };

  return (
    <footer className="bg-ocean-dark text-cream/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full bg-cream shrink-0 overflow-hidden ring-2 ring-gold/60">
                <OrgLogo src={brand.logoUrl} name={brand.name} sizes="48px" />
              </div>
              <div>
                <div className="text-gold font-bold text-lg">{brand.name}</div>
                <div className="text-cream/50 text-xs">{brand.tagline}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-gold font-semibold mb-4">{t.navTitle}</h3>
            <ul className="space-y-2 text-sm">
              {t.nav.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-gold transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-gold font-semibold mb-4">{t.contactsTitle}</h3>
            <ul className="space-y-2 text-sm">
              {address && <li className="whitespace-pre-line">{address}</li>}
              {organization?.phone && (
                <li>
                  {t.phoneLabel}:{" "}
                  <a href={telHref(organization.phone)} className="hover:text-gold transition-colors">
                    {organization.phone}
                  </a>
                </li>
              )}
              {organization?.email && (
                <li>
                  <a href={`mailto:${organization.email}`} className="hover:text-gold transition-colors">
                    {organization.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* The platform's documents: the offer and the policy are also linked from the order and
            application forms, where they are accepted. */}
        <ul className="border-t border-cream/10 mt-8 pt-6 flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 text-xs text-cream/60">
          {Object.values(LEGAL_DOCS).map((doc) => (
            <li key={doc.id}>
              <Link href={doc.href} className="hover:text-gold transition-colors">
                {doc.title[locale]}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/40">
          <span>&copy; {new Date().getFullYear()} {brand.fullName}</span>
          {region && <span>{region}</span>}
        </div>
      </div>
    </footer>
  );
}
