import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteOrganization, localizedOrganization } from "@/lib/organization";
import { telHref } from "@/lib/contactLinks";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    brand: string;
    tagline: string;
    about: string;
    navTitle: string;
    nav: { href: string; label: string }[];
    contactsTitle: string;
    phoneLabel: string;
    copyright: string;
  }
> = {
  kk: {
    brand: "Кең Жылыой",
    tagline: "Жылыой аудандық мәдениет үйі",
    about:
      "Жылыой ауданының мәдениет үйі. «Жылыой сазы» фольклорлық ансамблі. Қазақ халқының музыкалық мұрасын сақтау мен насихаттау.",
    navTitle: "Навигация",
    nav: [
      { href: "/honored", label: "Халықтық үлгілі атағы бар ұжымдар" },
      { href: "/collectives", label: "Ұжымдар" },
      { href: "/afisha", label: "Афиша" },
      { href: "/video", label: "Бейне" },
      { href: "/plan", label: "Даму жоспары" },
      { href: "/contacts", label: "Байланыс" },
    ],
    contactsTitle: "Байланыс",
    phoneLabel: "Тел",
    copyright: "«Кең Жылыой» Жылыой аудандық мәдениет үйі",
  },
  ru: {
    brand: "Кен Жылыой",
    tagline: "Дом культуры Жылыойского района",
    about:
      "Дом культуры Жылыойского района. Фольклорный ансамбль «Жылыой сазы». Сохранение и популяризация музыкального наследия казахского народа.",
    navTitle: "Навигация",
    nav: [
      { href: "/honored", label: "Коллективы со званием «Народный»" },
      { href: "/collectives", label: "Коллективы" },
      { href: "/afisha", label: "Афиша" },
      { href: "/video", label: "Видео" },
      { href: "/plan", label: "План развития" },
      { href: "/contacts", label: "Контакты" },
    ],
    contactsTitle: "Контакты",
    phoneLabel: "Тел",
    copyright: "Дом культуры «Кен Жылыой» Жылыойского района",
  },
};

export default async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  // Контакты берутся из карточки учреждения, чтобы правка в админке доходила
  // до подвала на каждой странице.
  const organization = await getSiteOrganization();
  const address = organization ? localizedOrganization(organization, locale, "address") : null;

  return (
    <footer className="bg-ocean-dark text-cream/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-full bg-cream shrink-0 overflow-hidden ring-2 ring-gold/60">
                <Image src="/images/gallery/logo.png" alt={t.brand} fill quality={95} className="object-cover" sizes="48px" />
              </div>
              <div>
                <div className="text-gold font-bold text-lg">{t.brand}</div>
                <div className="text-cream/50 text-xs">{t.tagline}</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{t.about}</p>
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

        <div className="border-t border-cream/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/40">
          <span>&copy; {new Date().getFullYear()} {t.copyright}</span>
          <span>Жылыой ауданы, Атырау облысы</span>
        </div>
      </div>
    </footer>
  );
}
