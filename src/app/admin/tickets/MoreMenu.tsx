"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** The menu in three groups, each under a small heading and split from the next by a line. */
const GROUPS = [
  {
    title: "Мероприятия и продажи",
    links: [
      { href: "/admin/culture-events/new?for=tickets", label: "Добавить мероприятие", badge: false },
      { href: "/admin/tickets/orders", label: "Заказы", badge: false },
      { href: "/admin/tickets/bookings", label: "Ожидают оплаты", badge: true },
      { href: "/admin/tickets/transactions", label: "Платежи и возвраты", badge: false },
    ],
  },
  {
    title: "Вход на мероприятие",
    links: [
      { href: "/admin/tickets/scan", label: "Сканер билетов", badge: false },
      { href: "/admin/tickets/checkins", label: "Журнал входов", badge: false },
    ],
  },
  {
    title: "Аналитика и настройки",
    links: [
      { href: "/admin/tickets/stats", label: "Статистика", badge: false },
      { href: "/admin/tickets/halls", label: "Залы и места", badge: false },
      { href: "/admin/tickets/payments", label: "Способы оплаты", badge: false },
    ],
  },
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
        <nav
          aria-label="Билеты: действия"
          className="absolute right-0 top-full mt-2 w-64 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain bg-white rounded-3xl border border-cream-dark shadow-lg p-2 z-20"
        >
          {GROUPS.map((group, i) => (
            <div key={group.title} className={i > 0 ? "mt-1.5 pt-1.5 border-t border-cream-dark" : ""}>
              <p className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ocean/40">
                {group.title}
              </p>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-2 px-4 py-2 rounded-full text-sm font-medium text-ocean hover:bg-cream/60 transition-colors"
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
          ))}
        </nav>
      )}
    </div>
  );
}
