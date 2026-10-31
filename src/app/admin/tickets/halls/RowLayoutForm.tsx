"use client";

import { useState, useTransition } from "react";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { sectionLabel, type HallSection } from "@/lib/hallSections";
import type { RowAlignment } from "@/lib/hallRowLayout";
import { saveRowLayout } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

const ALIGNMENTS: { value: RowAlignment; label: string }[] = [
  { value: "center", label: "По центру" },
  { value: "left", label: "Слева" },
  { value: "right", label: "Справа" },
  { value: "custom", label: "Задать сдвиг" },
];

export type RowLayoutRow = {
  section: HallSection;
  label: string;
  /** Seats the row has now: its own setting, or its last active seat. */
  seatCount: number;
  /** The number of the row's first seat. */
  firstSeat: number;
  alignment: RowAlignment;
  offsetStart: number;
  /** The row has a setting of its own (and so can be reset). */
  custom: boolean;
};

/**
 * One row on its own: how many seats it has and where they stand within the section's full
 * width — for a short last row, a row cut by a column, a row shifted to clear an aisle.
 */
export default function RowLayoutForm({
  hallId,
  rows,
  fullWidths,
}: {
  hallId: string;
  rows: RowLayoutRow[];
  /** Seats in a full row of each section: what «Сбросить» brings a row back to. */
  fullWidths: Partial<Record<HallSection, number>>;
}) {
  const sections = [...new Set(rows.map((row) => row.section))];
  const [section, setSection] = useState<HallSection>(sections[0] ?? "parter");
  const sectionRows = rows.filter((row) => row.section === section);
  const [label, setLabel] = useState(sectionRows[0]?.label ?? "");
  const row = sectionRows.find((r) => r.label === label) ?? sectionRows[0];
  if (!row) return null;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="row-layout-section">
            Сектор
          </label>
          <select
            id="row-layout-section"
            value={section}
            onChange={(e) => {
              const next = e.target.value as HallSection;
              setSection(next);
              setLabel(rows.find((r) => r.section === next)?.label ?? "");
            }}
            className={INPUT}
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                {sectionLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor="row-layout-row">
            Настроить ряд №
          </label>
          <select id="row-layout-row" value={row.label} onChange={(e) => setLabel(e.target.value)} className={INPUT}>
            {sectionRows.map((r) => (
              <option key={r.label} value={r.label}>
                Ряд {r.label} · {r.seatCount} мест{r.custom ? " · настроен" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keyed by the row and its saved values: another row, or the page coming back after a save,
          starts the fields over from what is stored. */}
      <RowEditor
        key={`${row.section}:${row.label}:${row.seatCount}:${row.firstSeat}:${row.alignment}:${row.offsetStart}`}
        hallId={hallId}
        row={row}
        fullWidth={fullWidths[row.section] ?? row.seatCount}
      />
    </div>
  );
}

function RowEditor({ hallId, row, fullWidth }: { hallId: string; row: RowLayoutRow; fullWidth: number }) {
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [seatCount, setSeatCount] = useState(String(row.seatCount));
  const [firstSeat, setFirstSeat] = useState(String(row.firstSeat));
  const [alignment, setAlignment] = useState<RowAlignment>(row.alignment);
  const [offset, setOffset] = useState(String(row.offsetStart));

  function submit(reset: boolean) {
    const count = reset ? fullWidth : Number.parseInt(seatCount, 10);
    startTransition(async () => {
      const result = await saveRowLayout({
        hallId,
        section: row.section,
        rowLabel: row.label,
        seatCount: count,
        firstSeat: reset ? 1 : Number.parseInt(firstSeat, 10) || 1,
        alignment: reset ? "center" : alignment,
        offsetStart: Number.parseInt(offset, 10) || 0,
        reset,
      });
      if (result.ok) feedback.success(reset ? `Ряд ${row.label} сброшен` : `Ряд ${row.label} сохранён`);
      else feedback.error(result.error ?? "Не удалось сохранить ряд.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="row-layout-count">
            Количество мест в этом ряду
          </label>
          <input
            id="row-layout-count"
            type="number"
            min={1}
            max={200}
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">Полный ряд в этом секторе — {fullWidth} мест.</p>
        </div>
        <div>
          <label className={LABEL} htmlFor="row-layout-first">
            Нумерация с места №
          </label>
          <input
            id="row-layout-first"
            type="number"
            min={1}
            max={200}
            value={firstSeat}
            onChange={(e) => setFirstSeat(e.target.value)}
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">
            Например, 8: ряд из 7 мест получит номера 8–14. Обычно 1.
          </p>
        </div>
        {alignment === "custom" && (
          <div>
            <label className={LABEL} htmlFor="row-layout-offset">
              Пропустить мест слева
            </label>
            <input
              id="row-layout-offset"
              type="number"
              min={0}
              max={200}
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              className={INPUT}
            />
          </div>
        )}
      </div>

      <div>
        <p className={LABEL}>Выравнивание</p>
        <div role="radiogroup" aria-label="Выравнивание" className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {ALIGNMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={alignment === option.value}
              onClick={() => setAlignment(option.value)}
              className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                alignment === option.value
                  ? "bg-ocean text-cream border-ocean"
                  : "bg-white text-ocean/70 border-cream-dark hover:text-ocean hover:border-ocean/40"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить ряд"}
        </button>
        {row.custom && (
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending}
            className="px-4 py-2 rounded-full border border-cream-dark text-sm font-semibold text-ocean/70 hover:text-ocean disabled:opacity-50"
          >
            Сбросить ряд ({fullWidth} мест, по центру)
          </button>
        )}
      </div>

      <p className="text-xs text-ocean/40">
        Лишние места ряда скрываются, а не удаляются: уже купленные на них билеты остаются действительными. Изменение сетки
        сектора выше сбрасывает настройки его рядов.
      </p>
    </div>
  );
}
