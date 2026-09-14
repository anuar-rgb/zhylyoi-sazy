"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useState, useEffect, useRef } from "react";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  { brand: string; tagline: string; nav: { href: string; label: string }[]; more: { href: string; label: string }[]; menuLabel: string; moreLabel: string }
> = {
  kk: {
    brand: "Кең Жылыой",
    tagline: "Жылыой аудандық мәдениет үйі",
    menuLabel: "Мәзір",
    moreLabel: "Тағы да",
    nav: [
      { href: "/", label: "Басты бет" },
      { href: "/honored", label: "Халықтық үлгілі атағы бар ұжымдар" },
      { href: "/collectives", label: "Ұжымдар" },
      { href: "/afisha", label: "Афиша" },
    ],
    more: [
      { href: "/about", label: "Ансамбль туралы" },
      { href: "/members", label: "Құрам" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/#clubs", label: "Шығармашылық үйірмелер мен секциялар" },
      { href: "/#news", label: "Жаңалықтар" },
      { href: "/video", label: "Бейне" },
      { href: "/plan", label: "Даму жоспары" },
      { href: "/staff", label: "Қызметкерлер" },
      { href: "/contacts", label: "Байланыс" },
    ],
  },
  ru: {
    brand: "Кен Жылыой",
    tagline: "Дом культуры Жылыойского района",
    menuLabel: "Меню",
    moreLabel: "Ещё",
    nav: [
      { href: "/", label: "Главная" },
      { href: "/honored", label: "Коллективы со званием «Народный»" },
      { href: "/collectives", label: "Коллективы" },
      { href: "/afisha", label: "Афиша" },
    ],
    more: [
      { href: "/about", label: "Об ансамбле" },
      { href: "/members", label: "Состав" },
      { href: "/repertoire", label: "Репертуар" },
      { href: "/#clubs", label: "Творческие кружки и секции" },
      { href: "/#news", label: "Новости" },
      { href: "/video", label: "Видео" },
      { href: "/plan", label: "План развития" },
      { href: "/staff", label: "Сотрудники" },
      { href: "/contacts", label: "Контакты" },
    ],
  },
};

function LanguageSwitcher({ pathname, className = "" }: { pathname: string; className?: string }) {
  const locale = useLocale();
  const otherLocale = locale === "kk" ? "ru" : "kk";
  const otherLabel = locale === "kk" ? "РУС" : "ҚАЗ";

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gold text-ocean hover:bg-gold-light transition-colors ${className}`}
    >
      {otherLabel}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = content[locale];
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const locked = menuOpen || moreOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    document.documentElement.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [moreOpen]);

  return (
    <header className="bg-ocean/65 backdrop-blur-lg backdrop-saturate-150 text-cream shadow-lg sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-cream shrink-0 overflow-hidden ring-2 ring-gold/60">
              <Image
                src="/images/gallery/logo.png"
                alt={t.brand}
                fill
                quality={95}
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0">
              <div className="text-gold font-bold text-sm sm:text-base lg:text-lg leading-tight truncate">{t.brand}</div>
              <div className="text-cream/70 text-[10px] sm:text-[11px] lg:text-xs leading-snug truncate">{t.tagline}</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {t.nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
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
            <LanguageSwitcher pathname={pathname} className="hidden lg:inline-block" />

            <div className="relative hidden lg:block" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`p-2 rounded-full transition-colors ${
                  moreOpen ? "bg-ocean-light text-gold" : "text-cream/90 hover:bg-ocean-light hover:text-gold"
                }`}
                aria-label={t.moreLabel}
                aria-expanded={moreOpen}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="4" cy="10" r="1.8" />
                  <circle cx="10" cy="10" r="1.8" />
                  <circle cx="16" cy="10" r="1.8" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl border border-cream-dark shadow-lg py-2 z-50">
                  {t.more.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-5 py-2.5 text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? "text-gold-dark font-semibold"
                          : "text-ocean hover:bg-cream/60"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 -mr-2 rounded-full text-cream hover:bg-ocean-light transition-colors"
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
        className={`lg:hidden fixed left-0 right-0 top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-y-auto bg-ocean z-40 transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="px-4 py-6 space-y-1">
          {t.nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-full text-lg font-medium transition-colors ${
                pathname === link.href
                  ? "bg-gold text-ocean"
                  : "text-cream/90 active:bg-ocean-light"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t border-cream/10">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-cream/40">{t.moreLabel}</p>
            {t.more.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-full text-lg font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-gold text-ocean"
                    : "text-cream/90 active:bg-ocean-light"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-cream/10">
            <LanguageSwitcher pathname={pathname} className="text-sm" />
          </div>
        </nav>
      </div>
    </header>
  );
}
