"use client";

import { useEffect, useState } from "react";

/** How far down the page, in px, before the button shows. */
const SHOW_AFTER = 250;

/**
 * «Наверх»: one floating button on every page, site and admin alike, mounted once in each
 * layout. Hidden at the top of the page, it fades in once the page is scrolled past
 * SHOW_AFTER and brings the reader back to the top — the menu, the filters, the page's own
 * «← Назад» link are all up there. Bottom-right: the toasts sit at the top, and the full-screen
 * mobile menu (z-50) covers it while open.
 */
export default function ScrollTopButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 h-11 sm:h-12 pl-3.5 pr-4 rounded-full bg-ocean/90 text-cream backdrop-blur shadow-lg ring-1 ring-white/20 text-sm font-semibold hover:bg-ocean active:scale-95 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-6 6m6-6l6 6" />
      </svg>
      {label}
    </button>
  );
}
