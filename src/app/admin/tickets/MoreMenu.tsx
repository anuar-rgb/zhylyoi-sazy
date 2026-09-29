"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/admin/culture-events/new", label: "Добавить мероприятие", badge: false },
  { href: "/admin/tickets/bookings", label: "Ожидают оплаты", badge: true },
  { href: "/admin/tickets/scan", label: "Сканер билетов", badge: false },
  { href: "/admin/tickets/halls", label: "Залы и места", badge: false },
  { href: "/admin/tickets/payments", label: "Способы оплаты", badge: false },
];

/**
 * Every admin action for this section, tucked away so "Билеты" opens
 * straight on the events list. Same interaction pattern as the public
 * Header's "Ещё" dropdown: click-outside and Escape both close it. The
 * trigger itself carries the pending-payments badge — the one thing staff
 * would otherwise lose at-a-glance by hiding its card.
 */
export default function MoreMenu({ pendingCount }: { pendingCount: number }) {
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
        className={`relative p-2 rounded-full transition-colors ${
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
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl border border-cream-dark shadow-lg p-2 z-20">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-ocean hover:bg-cream/60 transition-colors"
            >
              {link.label}
              {link.badge && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
