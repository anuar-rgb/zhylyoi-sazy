"use client";

import { useEffect, useState } from "react";

export type OrderGroup = "paid" | "pending" | "refunded" | "closed";

const FILTERS: { id: "all" | OrderGroup; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "paid", label: "Оплаченные" },
  { id: "pending", label: "Ждут оплаты" },
  { id: "refunded", label: "Возвраты" },
  { id: "closed", label: "Отклонённые и истёкшие" },
];

/** Orders shown before «Показать все»: a full hall should not stretch the page. */
const LIMIT = 10;

/**
 * The event's orders, newest first, with the status filters that «Заказы» used to have. The cards
 * themselves are rendered on the server; this only filters and folds them. A link to one order
 * (#order-DK-000154, from the hall map or the order search) unfolds the list and scrolls to it.
 */
export default function OrderList({ items }: { items: { key: string; anchor: string; group: OrderGroup; card: React.ReactNode }[] }) {
  const [filter, setFilter] = useState<"all" | OrderGroup>("all");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const reveal = () => {
      const anchor = decodeURIComponent(window.location.hash.slice(1));
      if (!items.some((item) => item.anchor === anchor)) return;
      setFilter("all");
      setExpanded(true);
      // After the unfolded list has rendered.
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
        <p className="text-ocean/60 text-sm">Заказов нет.</p>
      </div>
    );
  }

  const count = (id: "all" | OrderGroup) => (id === "all" ? items.length : items.filter((item) => item.group === id).length);
  const filtered = filter === "all" ? items : items.filter((item) => item.group === filter);
  const visible = expanded ? filtered : filtered.slice(0, LIMIT);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.filter((f) => f.id === "all" || count(f.id) > 0).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f.id ? "bg-ocean text-cream" : "bg-white border border-cream-dark text-ocean/70 hover:text-ocean"
            }`}
          >
            {f.label} <span className={filter === f.id ? "text-cream/70" : "text-ocean/40"}>{count(f.id)}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((item) => (
          <div key={item.key}>{item.card}</div>
        ))}
      </div>

      {filtered.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full rounded-3xl border border-cream-dark bg-white px-5 py-3 text-sm font-semibold text-ocean hover:bg-cream/40 transition-colors"
        >
          {expanded ? "Свернуть" : `Показать все заказы (${filtered.length})`}
        </button>
      )}
    </div>
  );
}
