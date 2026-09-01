"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useState, useEffect } from "react";
import type { Locale } from "@/i18n/routing";

const content: Record<Locale, { brand: string; tagline: string; nav: { href: string; label: string }[]; menuLabel: string }> = {
  kk: {
    brand: "Кең Жылыой",
    tagline: "Жылыой аудандық мәдениет үйі",
    menuLabel: "Мәзір",
    nav: [
      { href: "/", label: "Басты бет" },
      { href: "/about", label: "Ансамбль туралы" },
      { href: "/members", label: "Құрам" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/video", label: "Бейне" },
      { href: "/plan", label: "Даму жоспары" },
      { href: "/contacts", label: "Байланыс" },
    ],
  },
  ru: {
    brand: "Кен Жылыой",
    tagline: "Дом культуры Жылыойского района",
    menuLabel: "Меню",
    nav: [
      { href: "/", label: "Главная" },
      { href: "/about", label: "Об ансамбле" },
      { href: "/members", label: "Состав" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/video", label: "Видео" },
      { href: "/plan", label: "План развития" },
      { href: "/contacts", label: "Контакты" },
    ],
  },
};

function LanguageSwitcher({ pathname, className = "" }: { pathname: string; className?: string }) {
  const locale = useLocale();
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${className}`}>
      <Link
        href={pathname}
        locale="kk"
        className={`px-2 py-1 rounded transition-colors ${locale === "kk" ? "bg-gold text-ocean" : "text-cream/70 hover:text-gold"}`}
      >
        ҚАЗ
      </Link>
      <span className="text-cream/30">/</span>
      <Link
        href={pathname}
        locale="ru"
        className={`px-2 py-1 rounded transition-colors ${locale === "ru" ? "bg-gold text-ocean" : "text-cream/70 hover:text-gold"}`}
      >
        РУС
      </Link>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = content[locale];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <header className="bg-ocean text-cream shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-cream shrink-0 overflow-hidden ring-2 ring-gold/60">
              <Image
                src="/images/gallery/logo.jpeg"
                alt={t.brand}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-gold font-bold text-base lg:text-lg leading-tight">{t.brand}</div>
              <div className="text-cream/70 text-[11px] lg:text-xs">{t.tagline}</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {t.nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-gold text-ocean"
                    : "text-cream/90 hover:bg-ocean-light hover:text-gold"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher pathname={pathname} className="hidden lg:flex" />

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 -mr-2 rounded-md text-cream hover:bg-ocean-light transition-colors"
              aria-label={t.menuLabel}
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`lg:hidden fixed inset-0 top-14 sm:top-16 bg-ocean z-40 transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="px-4 py-6 space-y-1">
          {t.nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-lg font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gold text-ocean"
                  : "text-cream/90 active:bg-ocean-light"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 mt-2 border-t border-cream/10">
            <LanguageSwitcher pathname={pathname} className="text-sm" />
          </div>
        </nav>
      </div>
    </header>
  );
}
