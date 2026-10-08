"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSeatsActive, updateSeatsCategory } from "./actions";
import type { HallSeatRecord } from "@/lib/halls";
import { categoryLabel, categoryOptions } from "@/lib/seatCategories";

const NEW_CATEGORY_VALUE = "__new__";

/**
 * One panel for one or many selected seats — a single seat is just the N=1
 * case, not a separate code path. Category is a select over categories
 * already present in this hall, not free text, to avoid near-duplicates from
 * typos ("standard" vs "Standart"); "+ новая категория" is the escape hatch
 * for introducing the very first seat of a new one. Both actions require an
 * explicit button click rather than saving on change — fine for one seat, but
 * applying to dozens by accident on a stray click is the kind of mistake this
 * panel exists to make harder, not easier.
 *
 * Keyed by the caller on the sorted selected ids: remounting on every
 * selection change resets local state for free instead of syncing it by hand.
 */
export default function SeatBulkPanel({
  seats,
  existingCategories,
  onDone,
}: {
  seats: HallSeatRecord[];
  existingCategories: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(seats.length === 1 ? seats[0].category : "");
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = seats.map((seat) => seat.id);
  const label =
    seats.length === 1
      ? `Ряд ${seats[0].rowLabel}, место ${seats[0].seatNumber}`
      : `Выбрано мест: ${seats.length}`;
  // Стандарт and VIP are always offered; custom categories once some seat has one.
  const options = categoryOptions([...(seats.length === 1 ? [seats[0].category] : []), ...existingCategories]);
  const pendingCategory = (addingNew ? newCategory : category).trim();

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === NEW_CATEGORY_VALUE) {
      setAddingNew(true);
      setNewCategory("");
    } else {
      setCategory(e.target.value);
    }
  }

  async function applyCategory() {
    if (!pendingCategory) return;
    setBusy(true);
    setError(null);
    const result = await updateSeatsCategory(ids, pendingCategory);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setError("Не удалось изменить категорию.");
    }
  }

  async function applyActive(isActive: boolean) {
    setBusy(true);
    setError(null);
    const result = await setSeatsActive(ids, isActive);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setError("Не удалось изменить видимость мест.");
    }
  }

  return (
    <div className="mt-4 bg-cream/40 border border-cream-dark rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ocean">{label}</p>
        <button type="button" onClick={onDone} className="text-ocean/40 hover:text-ocean text-lg leading-none" aria-label="Снять выделение">
          ×
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {addingNew ? (
          <input
            autoFocus
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Новая категория"
            disabled={busy}
            className="w-40 px-3 py-1.5 text-sm border border-cream-dark rounded-full bg-white text-ocean focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
          />
        ) : (
          <select
            value={category}
            onChange={handleCategoryChange}
            disabled={busy}
            className="px-3 py-1.5 text-sm border border-cream-dark rounded-full bg-white text-ocean focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
          >
            <option value="" disabled>
              Категория…
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {categoryLabel(option)}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ новая категория</option>
          </select>
        )}
        <button
          type="button"
          onClick={applyCategory}
          disabled={busy || !pendingCategory}
          className="btn-primary px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
        >
          Применить категорию
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => applyActive(true)}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gold/15 text-ocean-dark hover:bg-gold/25 transition-colors disabled:opacity-50"
        >
          Показать
        </button>
        <button
          type="button"
          onClick={() => applyActive(false)}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ocean/5 text-ocean/60 hover:bg-ocean/10 transition-colors disabled:opacity-50"
        >
          Скрыть
        </button>
      </div>
    </div>
  );
}
