"use client";

import { useActionToast, useFeedback } from "@/components/feedback/FeedbackProvider";
import { useActionState, useState, useTransition } from "react";
import { regenerateSeatGrid } from "./actions";
import GridFieldset from "./GridFieldset";
import { PARTER, SECTIONS, sectionLabel, type HallSection } from "@/lib/hallSections";

const ROW_SHAPES = [
  { value: "curved", title: "Изогнутые ряды", hint: "дугой к сцене", rows: [4, 12] },
  { value: "straight", title: "Прямые ряды", hint: "ровная сетка", rows: [4, 12] },
] as const;

/**
 * Resizes one section of an existing hall's grid — or adds a section the hall did not have
 * yet, or removes one (side sections and balcony only, with their own button). rows/seats-per-row
 * are optional here (blank means "leave the grid as it is"), unlike the required fields on hall
 * creation. Growing adds missing seats; shrinking hides (never deletes) whatever falls outside
 * the new shape, since a booking may already reference it — see regenerateSeatGrid's own
 * comment for the full rule.
 */
export default function GenerateGridForm({
  hallId,
  sizes,
  rowShape,
}: {
  hallId: string;
  /** How the hall's seat maps draw the rows; saved with «Применить изменение сетки». */
  rowShape: "curved" | "straight";
  /** Current shape of each section that has active seats: rows × widest row. */
  sizes: Partial<Record<HallSection, { rows: number; seats: number }>>;
}) {
  const [state, formAction, pending] = useActionState(regenerateSeatGrid, { error: null });
  useActionToast(state, "Схема зала обновлена");
  const feedback = useFeedback();
  const [removing, startRemoving] = useTransition();
  const [section, setSection] = useState<HallSection>(PARTER);
  const current = sizes[section];
  const canRemove = section !== PARTER && !!current;

  // Submitted by hand rather than through <form action>: a form action resets the form when it
  // finishes, which put the section list back on «Партер» while the hint below still described
  // the section chosen before.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startRemoving(() => formAction(data));
  }

  async function handleRemove() {
    const name = sectionLabel(section);
    const confirmed = await feedback.confirm({
      title: `Удалить «${name}»?`,
      message:
        `Места сектора (${current!.rows} × ${current!.seats}) перестанут продаваться на мероприятиях этого зала. ` +
        "Уже купленные на них билеты остаются действительными.",
      confirmLabel: "Удалить сектор",
      danger: true,
    });
    if (!confirmed) return;

    const data = new FormData();
    data.set("id", hallId);
    data.set("section", section);
    data.set("rows", "0");
    data.set("seats_per_row", "0");
    startRemoving(async () => {
      const result = await regenerateSeatGrid({ error: null }, data);
      if (result.error) feedback.error(result.error);
      else {
        feedback.success(`«${name}» удалён`);
        setSection(PARTER);
      }
    });
  }

  const busy = pending || removing;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-10l-1 12H8L7 7" />
            </svg>
            Удалить {sectionLabel(section).toLowerCase()}
          </button>
        )}
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

      <fieldset>
        <legend className="block text-sm font-medium text-ocean/70 mb-1.5">Геометрия рядов</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {ROW_SHAPES.map((shape) => (
            <label
              key={shape.value}
              className="flex items-center gap-3 p-3 rounded-2xl border border-cream-dark bg-cream/30 cursor-pointer has-[:checked]:border-ocean has-[:checked]:bg-ocean/5"
            >
              <input type="radio" name="row_shape" value={shape.value} defaultChecked={rowShape === shape.value} className="accent-ocean shrink-0" />
              <svg width="44" height="26" viewBox="0 0 44 26" className="shrink-0 text-ocean/60" aria-hidden>
                {shape.rows.map((y, i) => (
                  <path key={i} d={shape.value === "curved" ? `M4 ${y} Q22 ${y + 7} 40 ${y}` : `M4 ${y + 3} L40 ${y + 3}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 5" />
                ))}
              </svg>
              <span className="text-sm text-ocean">
                <span className="font-semibold block">{shape.title}</span>
                <span className="text-xs text-ocean/50">{shape.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ocean/40 mt-1.5">Для всего зала: так схема выглядит в админке и у покупателя. Места и билеты не меняются.</p>
      </fieldset>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Применение…" : "Применить изменение сетки"}
      </button>
    </form>
  );
}
