"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState, useState } from "react";
import { regenerateSeatGrid } from "./actions";
import GridFieldset from "./GridFieldset";
import { PARTER, SECTIONS, sectionLabel, type HallSection } from "@/lib/hallSections";

/**
 * Resizes one section of an existing hall's grid — or adds a section the hall did not have
 * yet, or removes one (rows = 0, side sections and balcony only). rows/seats-per-row are
 * optional here (blank means "leave the grid as it is"), unlike the required fields on hall
 * creation. Growing adds missing seats; shrinking hides (never deletes) whatever falls outside
 * the new shape, since a booking may already reference it — see regenerateSeatGrid's own
 * comment for the full rule.
 */
export default function GenerateGridForm({
  hallId,
  sizes,
}: {
  hallId: string;
  /** Current shape of each section that has active seats: rows × widest row. */
  sizes: Partial<Record<HallSection, { rows: number; seats: number }>>;
}) {
  const [state, formAction, pending] = useActionState(regenerateSeatGrid, { error: null });
  useActionToast(state, "Схема зала обновлена");
  const [section, setSection] = useState<HallSection>(PARTER);
  const current = sizes[section];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={hallId} />

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <span key={s} className="text-xs text-ocean/60 bg-cream/50 border border-cream-dark rounded-full px-3 py-1">
            {sectionLabel(s)}: {sizes[s] ? `${sizes[s]!.rows} × ${sizes[s]!.seats}` : "нет"}
          </span>
        ))}
      </div>

      <div className="sm:w-1/2 sm:pr-2">
        <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="grid-section">
          Сектор
        </label>
        <select
          id="grid-section"
          name="section"
          value={section}
          onChange={(e) => setSection(e.target.value as HallSection)}
          className="w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {sectionLabel(s)}
              {sizes[s] ? "" : " — добавить"}
            </option>
          ))}
        </select>
        <p className="text-xs text-ocean/40 mt-1.5">
          {current
            ? `Сейчас ${current.rows} рядов по ${current.seats} мест.`
            : "Такого сектора в зале ещё нет — укажите размер, и он появится."}
          {section !== PARTER && current && " Чтобы убрать сектор, укажите 0 рядов."}
        </p>
      </div>

      <p className="bg-gold/10 border border-gold/30 text-ocean-dark text-sm rounded-2xl px-4 py-3">
        Уменьшение рядов или мест в ряду не удаляет лишние места — они скрываются (перестают продаваться), но уже
        оформленные на них билеты остаются действительными. Увеличение добавляет только недостающие места, остальные
        не трогает.
      </p>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <GridFieldset allowZeroRows={section !== PARTER} />

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
