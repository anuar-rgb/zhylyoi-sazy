"use client";

import { useActionState } from "react";
import { generateSeatGrid } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/**
 * One-shot setup for an empty hall: how many rows, how many seats per row, what the
 * rows are called, one default category for all of them. Meant to run once — running
 * it again on a hall that already has seats fails on the unique (hall_id, row_label,
 * seat_number) index rather than silently duplicating anything.
 */
export default function GenerateGridForm({ hallId }: { hallId: string }) {
  const [state, formAction, pending] = useActionState(generateSeatGrid, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="hall_id" value={hallId} />

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="rows">
            Число рядов
          </label>
          <input id="rows" name="rows" type="number" min={1} max={200} required defaultValue={10} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="seats_per_row">
            Мест в ряду
          </label>
          <input
            id="seats_per_row"
            name="seats_per_row"
            type="number"
            min={1}
            max={200}
            required
            defaultValue={20}
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <p className={LABEL}>Обозначение ряда</p>
        <div className="flex gap-4 text-sm text-ocean/80">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="row_format" value="letter" defaultChecked className="accent-ocean" />
            Буквы (A, B, C…)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="row_format" value="number" className="accent-ocean" />
            Числа (1, 2, 3…)
          </label>
        </div>
      </div>

      <div className="sm:w-1/2 sm:pr-2">
        <label className={LABEL} htmlFor="category">
          Категория мест
        </label>
        <input id="category" name="category" defaultValue="standard" placeholder="standard" className={INPUT} />
        <p className="text-xs text-ocean/40 mt-1.5">
          Одна категория на всю сетку — разные места можно поменять по отдельности после создания.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Создание…" : "Создать сетку мест"}
      </button>
    </form>
  );
}
