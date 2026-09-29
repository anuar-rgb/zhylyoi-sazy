"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/admin/tickets/halls", label: "Залы и места" },
  { href: "/admin/tickets/payments", label: "Способы оплаты" },
];

/**
 * Setup/config links that staff open rarely — kept out from under the
 * operational cards (pending payments, scanner) and the events list, which
 * is what "Билеты" should open on. Same interaction pattern as the public
 * Header's "Ещё" dropdown: click-outside and Escape both close it.
 */
export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded-full transition-colors ${
          open ? "bg-ocean/10 text-ocean" : "text-ocean/50 hover:bg-ocean/10 hover:text-ocean"
        }`}
        aria-label="Ещё"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="1.8" />
          <circle cx="10" cy="10" r="1.8" />
          <circle cx="16" cy="10" r="1.8" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl border border-cream-dark shadow-lg p-2 z-20">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 rounded-full text-sm font-medium text-ocean hover:bg-cream/60 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
