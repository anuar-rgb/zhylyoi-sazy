"use client";

import { useState } from "react";
import { seatName } from "@/lib/hallSections";
import { categoryLabel } from "@/lib/seatCategories";
import { formatDateTime } from "@/lib/timeZone";
import type { SoldTicket } from "@/lib/ticketing/occupancy";

/** Rows shown before «Показать все»: a hall of 200 sold seats should not stretch the page. */
const LIMIT = 5;

function money(amount: number): string {
  return amount > 0 ? `${amount.toLocaleString("ru-RU")} ₸` : "бесплатно";
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${up ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * The sold tickets under the hall map: a table on a wide screen, one card per ticket on a phone.
 * Only the first five until «Показать все», which shows the rest and turns into «Свернуть».
 */
export default function SoldTickets({ tickets }: { tickets: SoldTicket[] }) {
  const [expanded, setExpanded] = useState(false);

  if (tickets.length === 0) {
    return <p className="text-sm text-ocean/60 px-5 sm:px-6 py-5">Проданных билетов нет.</p>;
  }

  const visible = expanded ? tickets : tickets.slice(0, LIMIT);
  // Rows past the first five fade in as they appear, so the list opens instead of jumping.
  const rowClass = (i: number) => (i >= LIMIT ? "reveal" : "");
  const entered = (t: SoldTicket) =>
    t.enteredAt ? <span className="text-gray-600">вошёл {formatDateTime(t.enteredAt)}</span> : <span className="text-ocean/40">нет</span>;

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ocean/50 border-b border-cream-dark">
              <th className="font-medium px-6 py-2.5">Место</th>
              <th className="font-medium px-3 py-2.5">Категория</th>
              <th className="font-medium px-3 py-2.5 text-right">Цена</th>
              <th className="font-medium px-3 py-2.5">Заказ</th>
              <th className="font-medium px-3 py-2.5">Покупатель</th>
              <th className="font-medium px-3 py-2.5">Телефон</th>
              <th className="font-medium px-6 py-2.5">Вход</th>
            </tr>
          </thead>
          <tbody id="sold-tickets" className="divide-y divide-cream-dark">
            {visible.map((t, i) => (
              <tr key={i} className={`text-ocean ${rowClass(i)}`}>
                <td className="px-6 py-2.5 whitespace-nowrap">{seatName(t)}</td>
                <td className="px-3 py-2.5">{t.category ? categoryLabel(t.category) : "—"}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{money(t.paid)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{t.orderNumber}</td>
                <td className="px-3 py-2.5">{t.buyerName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{t.buyerPhone}</td>
                <td className="px-6 py-2.5 whitespace-nowrap">{entered(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul id="sold-tickets-cards" className="md:hidden divide-y divide-cream-dark">
        {visible.map((t, i) => (
          <li key={i} className={`px-5 py-3 text-sm ${rowClass(i)}`}>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ocean">{seatName(t)}</span>
              <span className="text-ocean shrink-0">{money(t.paid)}</span>
            </div>
            <p className="text-ocean/60">
              {t.category ? categoryLabel(t.category) : "—"} · {t.orderNumber}
            </p>
            <p className="text-ocean/80">
              {t.buyerName} · {t.buyerPhone}
            </p>
            <p className="text-xs mt-0.5">Вход: {entered(t)}</p>
          </li>
        ))}
      </ul>

      {tickets.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="sold-tickets sold-tickets-cards"
          className="w-full flex items-center justify-center gap-1.5 border-t border-cream-dark px-5 py-3 text-sm font-semibold text-ocean hover:bg-cream/40 transition-colors"
        >
          {expanded ? "Свернуть" : `Показать все билеты (${tickets.length})`}
          <Chevron up={expanded} />
        </button>
      )}
    </>
  );
}
