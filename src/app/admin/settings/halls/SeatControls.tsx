"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSeat, setSeatActive, updateSeatCategory } from "./actions";

/**
 * The point-edit controls for one seat: change its category, hide it without
 * deleting it, or remove the row outright. Each fires its own server action and
 * refreshes the page rather than sharing one form — a seat's edits are independent
 * of its neighbours, and there can be hundreds of these on one page.
 */
export default function SeatControls({
  id,
  category,
  isActive,
  label,
}: {
  id: string;
  category: string;
  isActive: boolean;
  /** "Ряд A, место 4" — for the delete confirmation. */
  label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(category);
  const [busy, setBusy] = useState(false);

  async function handleCategoryBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === category) {
      setValue(category);
      return;
    }
    setBusy(true);
    const result = await updateSeatCategory(id, trimmed);
    setBusy(false);
    if (result.ok) router.refresh();
    else setValue(category);
  }

  async function handleToggleActive() {
    setBusy(true);
    const result = await setSeatActive(id, !isActive);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Удалить место? ${label}`)) return;
    setBusy(true);
    const result = await deleteSeat(id);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCategoryBlur}
        disabled={busy}
        className="w-20 px-2 py-1 text-xs border border-cream-dark rounded-full bg-cream/30 text-ocean text-center focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleToggleActive}
        disabled={busy}
        title={isActive ? "Скрыть место" : "Вернуть место"}
        className={`text-[11px] font-semibold px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
          isActive ? "bg-gold/15 text-ocean-dark hover:bg-gold/25" : "bg-ocean/5 text-ocean/50 hover:bg-ocean/10"
        }`}
      >
        {isActive ? "Активно" : "Скрыто"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        title="Удалить место"
        className="text-ocean/30 hover:text-red-600 transition-colors disabled:opacity-50 px-1"
      >
        ×
      </button>
    </div>
  );
}
