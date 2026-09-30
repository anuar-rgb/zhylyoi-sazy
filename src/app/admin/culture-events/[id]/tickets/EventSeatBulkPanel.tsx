"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setEventSeatCategory } from "./actions";
import type { HallSeatRecord } from "@/lib/halls";

const NEW_CATEGORY_VALUE = "__new__";

/**
 * Same shape as the hall's SeatBulkPanel, but "Скрыть" has no meaning for an
 * event (seats aren't hidden per event, only priced/categorized) — its
 * equivalent here is "Сбросить до стандарта", which deletes the override
 * row rather than writing one, since absence already means "standard".
 */
export default function EventSeatBulkPanel({
  eventId,
  seats,
  existingCategories,
  onDone,
}: {
  eventId: string;
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
  const options = Array.from(new Set([...(seats.length === 1 ? [seats[0].category] : []), ...existingCategories])).sort();
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
    const result = await setEventSeatCategory(eventId, ids, pendingCategory);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setError("Не удалось изменить категорию.");
    }
  }

  async function resetToStandard() {
    setBusy(true);
    setError(null);
    const result = await setEventSeatCategory(eventId, ids, null);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      onDone();
    } else {
      setError("Не удалось сбросить категорию.");
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
                {option}
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

      <button
        type="button"
        onClick={resetToStandard}
        disabled={busy}
        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ocean/5 text-ocean/60 hover:bg-ocean/10 transition-colors disabled:opacity-50"
      >
        Сбросить до стандарта
      </button>
    </div>
  );
}
