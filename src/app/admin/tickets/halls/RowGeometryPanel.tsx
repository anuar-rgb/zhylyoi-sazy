"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import type { RowAlignment, RowPlacement } from "@/lib/hallRowLayout";
import { sectionLabel } from "@/lib/hallSections";
import { saveRowLayout, setHallRowShape } from "./actions";

const ALIGNMENTS: { value: RowAlignment; label: string }[] = [
  { value: "center", label: "По центру" },
  { value: "left", label: "Слева" },
  { value: "right", label: "Справа" },
  { value: "custom", label: "Задать сдвиг" },
];

const CHIP = "px-3.5 py-1.5 rounded-full border text-sm font-semibold transition-colors";
const chip = (on: boolean) => `${CHIP} ${on ? "bg-ocean text-cream border-ocean" : "bg-white text-ocean/70 border-cream-dark hover:text-ocean"}`;

/**
 * Where one row stands, set from the seat map itself: shown in the bottom panel when the selected
 * seats are all of one row. Each choice moves the row on the map at once (a preview); «Применить»
 * stores it in the hall's row settings — the same ones as «Отдельные ряды» below the map.
 * The row shape (arc or straight) belongs to the whole hall and is saved straight away.
 */
export default function RowGeometryPanel({
  hallId,
  section,
  rowLabel,
  seatCount,
  placement,
  rowShape,
  onPreview,
}: {
  hallId: string;
  section: string;
  rowLabel: string;
  /** Seats the row has now; kept as is — only where it stands changes here. */
  seatCount: number;
  placement: RowPlacement;
  rowShape: "curved" | "straight";
  /** Shows a placement on the map before it is saved; null drops the preview. */
  onPreview: (placement: RowPlacement | null) => void;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [alignment, setAlignment] = useState<RowAlignment>(placement.alignment);
  const [offset, setOffset] = useState(String(placement.offsetStart));
  const changed = alignment !== placement.alignment || (alignment === "custom" && (Number.parseInt(offset, 10) || 0) !== placement.offsetStart);

  function preview(nextAlignment: RowAlignment, nextOffset: string) {
    onPreview({ alignment: nextAlignment, offsetStart: nextAlignment === "custom" ? Math.max(0, Number.parseInt(nextOffset, 10) || 0) : 0 });
  }

  function save() {
    startTransition(async () => {
      const result = await saveRowLayout({
        hallId,
        section,
        rowLabel,
        seatCount,
        alignment,
        offsetStart: Number.parseInt(offset, 10) || 0,
      });
      if (result.ok) {
        feedback.success(`Ряд ${rowLabel} сохранён`);
        router.refresh();
      } else feedback.error(result.error ?? "Не удалось сохранить ряд.");
    });
  }

  function saveShape(shape: "curved" | "straight") {
    if (shape === rowShape) return;
    startTransition(async () => {
      const result = await setHallRowShape(hallId, shape);
      if (result.ok) {
        feedback.success(shape === "straight" ? "Ряды зала — прямые" : "Ряды зала — дугой");
        router.refresh();
      } else feedback.error(result.error ?? "Не удалось сохранить.");
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-cream-dark space-y-3">
      <p className="text-sm font-semibold text-ocean">
        Ряд {rowLabel}
        {section !== "parter" && <span className="font-normal text-ocean/60"> · {sectionLabel(section)}</span>}
        <span className="font-normal text-ocean/60"> · {seatCount} мест</span>
      </p>

      <div>
        <p className="text-xs text-ocean/60 mb-1.5">Выравнивание ряда</p>
        <div className="flex flex-wrap gap-2">
          {ALIGNMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={alignment === option.value}
              onClick={() => {
                setAlignment(option.value);
                preview(option.value, offset);
              }}
              className={chip(alignment === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {alignment === "custom" && (
        <label className="flex items-center gap-2 text-sm text-ocean/70">
          Пропустить мест слева
          <input
            type="number"
            min={0}
            max={200}
            value={offset}
            onChange={(e) => {
              setOffset(e.target.value);
              preview("custom", e.target.value);
            }}
            className="w-20 px-3 py-1.5 border border-cream-dark rounded-xl bg-white text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={pending || !changed} className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? "Сохранение…" : `Применить к ряду ${rowLabel}`}
        </button>
        {changed && (
          <button
            type="button"
            onClick={() => {
              setAlignment(placement.alignment);
              setOffset(String(placement.offsetStart));
              onPreview(null);
            }}
            className="text-sm font-semibold text-ocean/60 hover:text-ocean"
          >
            Отменить
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-ocean/60 mb-1.5">Форма рядов — для всего зала</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} aria-pressed={rowShape === "curved"} onClick={() => saveShape("curved")} className={chip(rowShape === "curved")}>
            Изогнутые
          </button>
          <button type="button" disabled={pending} aria-pressed={rowShape === "straight"} onClick={() => saveShape("straight")} className={chip(rowShape === "straight")}>
            Прямые
          </button>
        </div>
      </div>
    </div>
  );
}
