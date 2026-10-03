"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState } from "react";
import { regenerateSeatGrid } from "./actions";
import GridFieldset from "./GridFieldset";

/**
 * Resizes an existing hall's grid — rows/seats-per-row are optional here
 * (blank means "leave the grid as it is"), unlike the required fields on
 * hall creation. Growing adds missing seats; shrinking hides (never deletes)
 * whatever falls outside the new shape, since a booking may already
 * reference it — see regenerateSeatGrid's own comment for the full rule.
 */
export default function GenerateGridForm({ hallId }: { hallId: string }) {
  const [state, formAction, pending] = useActionState(regenerateSeatGrid, { error: null });
  useActionToast(state, "Схема зала обновлена");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={hallId} />

      <p className="bg-gold/10 border border-gold/30 text-ocean-dark text-sm rounded-2xl px-4 py-3">
        Уменьшение рядов или мест в ряду не удаляет лишние места — они скрываются (перестают продаваться), но уже
        оформленные на них билеты остаются действительными. Увеличение добавляет только недостающие места, остальные
        не трогает.
      </p>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <GridFieldset />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Применение…" : "Применить изменение сетки"}
      </button>
    </form>
  );
}
