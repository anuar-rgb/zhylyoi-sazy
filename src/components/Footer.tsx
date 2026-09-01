import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
    address: string[];
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
      { href: "/about", label: "Ансамбль туралы" },
      { href: "/members", label: "Құрам" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/video", label: "Бейне" },
      { href: "/plan", label: "Даму жоспары" },
      { href: "/contacts", label: "Байланыс" },
    ],
    contactsTitle: "Байланыс",
    address: ["Атырау облысы, Жылыой ауданы", "Құлсары қ., Махамбет даңғылы, 37", "Тел: +7 778 927 63 87", "dk.kenzhylyoi@gmail.com"],
    copyright: "«Кең Жылыой» Жылыой аудандық мәдениет үйі",
  },
  ru: {
    brand: "Кен Жылыой",
    tagline: "Дом культуры Жылыойского района",
    about:
      "Дом культуры Жылыойского района. Фольклорный ансамбль «Жылыой сазы». Сохранение и популяризация музыкального наследия казахского народа.",
    navTitle: "Навигация",
    nav: [
      { href: "/about", label: "Об ансамбле" },
      { href: "/members", label: "Состав" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/video", label: "Видео" },
      { href: "/plan", label: "План развития" },
      { href: "/contacts", label: "Контакты" },
    ],
    contactsTitle: "Контакты",
    address: [
      "Атырауская область, Жылыойский район",
      "г. Кульсары, проспект Махамбет, 37",
      "Тел: +7 778 927 63 87",
      "dk.kenzhylyoi@gmail.com",
    ],
    copyright: "Дом культуры «Кен Жылыой» Жылыойского района",
  },
};

export default async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <footer className="bg-forest-dark text-cream/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full bg-cream shrink-0 overflow-hidden ring-2 ring-gold/60">
                <Image src="/images/gallery/logo.jpeg" alt={t.brand} fill className="object-cover" sizes="40px" />
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
              {t.address.map((line) => (
                <li key={line}>{line}</li>
              ))}
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
