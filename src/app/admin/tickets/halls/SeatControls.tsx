"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSeatActive, updateSeatCategory } from "./actions";

const NEW_CATEGORY_VALUE = "__new__";

/**
 * The point-edit controls for one seat: change its category, or hide it without
 * deleting the row. No hard-delete control on purpose — Phase 3's booking_items
 * will reference hall_seats.id, and removing the row later would cascade into
 * whatever booked it. "Скрыто" is the only removal a seat ever gets.
 *
 * Category is a select over the categories already present in this hall, not a
 * free-text field — picking from what exists avoids near-duplicate categories
 * from typos ("standard" vs "Standart"). "+ новая категория" is the one escape
 * hatch, for turning the very first seat of a new category into one, without
 * having to regenerate the whole seat grid just to introduce it.
 *
 * Each control fires its own server action and refreshes the page rather than
 * sharing one form — a seat's edits are independent of its neighbours, and there
 * can be hundreds of these on one page.
 */
export default function SeatControls({
  id,
  category,
  isActive,
  existingCategories,
}: {
  id: string;
  category: string;
  isActive: boolean;
  existingCategories: string[];
}) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);

  const options = Array.from(new Set([category, ...existingCategories])).sort();

  async function saveCategory(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === category) return;
    setBusy(true);
    const result = await updateSeatCategory(id, trimmed);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (next === NEW_CATEGORY_VALUE) {
      setNewCategory("");
      setAddingNew(true);
      return;
    }
    saveCategory(next);
  }

  async function handleNewCategoryBlur() {
    if (!newCategory.trim()) {
      setAddingNew(false);
      return;
    }
    await saveCategory(newCategory);
    setAddingNew(false);
  }

  async function handleToggleActive() {
    setBusy(true);
    const result = await setSeatActive(id, !isActive);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      {addingNew ? (
        <input
          autoFocus
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onBlur={handleNewCategoryBlur}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="Новая категория"
          disabled={busy}
          className="w-28 px-2 py-1 text-xs border border-cream-dark rounded-full bg-cream/30 text-ocean text-center focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
        />
      ) : (
        <select
          value={category}
          onChange={handleSelectChange}
          disabled={busy}
          className="px-2 py-1 text-xs border border-cream-dark rounded-full bg-cream/30 text-ocean focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
        >
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
        onClick={handleToggleActive}
        disabled={busy}
        title={isActive ? "Скрыть место" : "Вернуть место"}
        className={`text-[11px] font-semibold px-2 py-1 rounded-full transition-colors disabled:opacity-50 ${
          isActive ? "bg-gold/15 text-ocean-dark hover:bg-gold/25" : "bg-ocean/5 text-ocean/50 hover:bg-ocean/10"
        }`}
      >
        {isActive ? "Активно" : "Скрыто"}
      </button>
    </div>
  );
}
