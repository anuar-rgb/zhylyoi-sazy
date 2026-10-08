"use client";

import { useEffect, useRef, useState } from "react";
import { sectionLabel } from "@/lib/hallSections";

/**
 * Pure presentation: one row of seats in, one row of circles out. The
 * component never fetches or interprets data — status is whatever string the
 * caller passes (public: available/selected/taken; admin: active/inactive),
 * and seatVariant() is the caller's translation of that into a look.
 */
export interface SeatMapSeat {
  id: string;
  /** parter (default), left, right or balcony. */
  section?: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  status: string;
}

export interface SeatMapRow {
  /** Same as its seats' section; rows are numbered within a section. */
  section?: string;
  label: string;
  seats: SeatMapSeat[];
}

/** Groups seats, already sorted by section, row and seat, into rows. */
export function seatsToRows(seats: SeatMapSeat[]): SeatMapRow[] {
  const rows: SeatMapRow[] = [];
  for (const seat of seats) {
    const section = seat.section ?? "parter";
    const current = rows[rows.length - 1];
    if (current && current.label === seat.rowLabel && (current.section ?? "parter") === section) current.seats.push(seat);
    else rows.push({ section, label: seat.rowLabel, seats: [seat] });
  }
  return rows;
}

export interface SeatMapLegendItem {
  swatchClassName: string;
  label: string;
}

export interface SeatMapProps {
  rows: SeatMapRow[];
  seatVariant: (seat: SeatMapSeat) => { className: string; disabled?: boolean };
  onSeatClick?: (seat: SeatMapSeat) => void;
  legend: SeatMapLegendItem[];
  /** Defaults to "Сцена" — a cultural centre's hall, not a cinema. */
  stageLabel?: string;
  seatTooltip?: (seat: SeatMapSeat) => string | undefined;
  className?: string;
  /** When set, the row-label captions become clickable (whole-row bulk select). Unused on the public seat picker. */
  onRowLabelClick?: (row: SeatMapRow) => void;
  /** Shown only when the hall is wider than its box, i.e. on a phone. */
  scrollHint?: string;
  /** Caption of a section block («Левый сектор», «Балкон»); Russian names by default. */
  sectionTitle?: (section: string) => string;
}

const SEAT_SIZE = 28;
const SEAT_GAP = 8;
const AISLE_WIDTH = 18;
/** Max upward lift, in px, for the outermost seat of the most curved row. */
const MAX_LIFT = 22;

type Slot = { kind: "seat"; key: string; seat: SeatMapSeat; x: number } | { kind: "aisle"; key: string; x: number };

/**
 * No x/y is stored anywhere — this just walks a row's seats in order and
 * places them left to right, opening a wider gap wherever seat_number skips
 * (an aisle), never where the caller inserted an artificial empty cell.
 * The resulting x is only ever used for the curvature math below, not for
 * real layout (that's still plain flow/flex) — it doesn't need to be exact,
 * only proportionally right.
 */
function layoutRow(seats: SeatMapSeat[]): { slots: Slot[]; width: number } {
  const slots: Slot[] = [];
  let x = 0;
  let prevSeatNumber: number | null = null;

  seats.forEach((seat, i) => {
    if (prevSeatNumber !== null) {
      x += SEAT_GAP;
      if (seat.seatNumber - prevSeatNumber > 1) {
        slots.push({ kind: "aisle", key: `aisle-${i}`, x });
        x += AISLE_WIDTH + SEAT_GAP;
      }
    }
    slots.push({ kind: "seat", key: seat.id, seat, x });
    x += SEAT_SIZE;
    prevSeatNumber = seat.seatNumber;
  });

  return { slots, width: x };
}

/**
 * Both the full-strength fill (legend, selected/edited seats) and a muted tint
 * of the same colour (an untouched, available seat) — as complete class name
 * literals, not built at runtime by slicing a string and appending "/25":
 * Tailwind only generates CSS for classes it can find as literal text while
 * scanning source files, so a class assembled from runtime fragments compiles
 * to nothing and the seat silently loses its colour.
 */
export type CategoryColor = { solid: string; muted: string };

/**
 * standard/vip are pinned to specific colours rather than assigned by order of
 * first appearance: with an order-based palette, a bulk edit or a re-fetch
 * that changes which seat sorts first could flip which colour "vip" got from
 * one save to the next — a category's colour has to mean the same thing every
 * time, not just be stably distinct within one render.
 *
 * Both spellings of "vip" are pinned: category is free text (see hall_seats),
 * and staff type it phonetically in Cyrillic ("вип") as often as in Latin —
 * an admin who only recognised "vip" would silently fall through to the
 * fallback palette for a category actually spelled "вип".
 */
const KNOWN_CATEGORY_COLORS: Record<string, CategoryColor> = {
  vip: { solid: "bg-gold text-ocean-dark", muted: "bg-gold/25 text-ocean hover:bg-gold/40" },
  "вип": { solid: "bg-gold text-ocean-dark", muted: "bg-gold/25 text-ocean hover:bg-gold/40" },
  standard: { solid: "bg-ocean text-cream", muted: "bg-ocean/25 text-ocean hover:bg-ocean/40" },
  "стандарт": { solid: "bg-ocean text-cream", muted: "bg-ocean/25 text-ocean hover:bg-ocean/40" },
};

/** For any category beyond the known ones — still stable, since the input is sorted before assigning. */
const FALLBACK_PALETTE: CategoryColor[] = [
  { solid: "bg-ocean-dark text-cream", muted: "bg-ocean-dark/25 text-ocean hover:bg-ocean-dark/40" },
  { solid: "bg-gold-dark text-cream", muted: "bg-gold-dark/25 text-ocean hover:bg-gold-dark/40" },
  { solid: "bg-ocean-light text-cream", muted: "bg-ocean-light/25 text-ocean hover:bg-ocean-light/40" },
  { solid: "bg-gold-light text-ocean-dark", muted: "bg-gold-light/25 text-ocean hover:bg-gold-light/40" },
];

export function assignCategoryColors(categories: string[]): Map<string, CategoryColor> {
  const map = new Map<string, CategoryColor>();
  const unique = Array.from(new Set(categories)).sort();
  let fallbackIndex = 0;
  for (const category of unique) {
    const known = KNOWN_CATEGORY_COLORS[category.trim().toLowerCase()];
    map.set(category, known ?? FALLBACK_PALETTE[fallbackIndex++ % FALLBACK_PALETTE.length]);
  }
  return map;
}

export default function SeatMap({
  rows,
  seatVariant,
  onSeatClick,
  legend,
  stageLabel = "Сцена",
  seatTooltip,
  className,
  onRowLabelClick,
  scrollHint = "Листайте схему в стороны",
  sectionTitle = (section) => sectionLabel(section, "ru"),
}: SeatMapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // A hall wider than its box scrolls sideways. Start in the middle, where the best seats are,
  // and say so, so the cut-off edge is not mistaken for the end of the hall.
  useEffect(() => {
    const outer = scrollRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let centered = false;
    const measure = () => {
      const over = inner.scrollWidth > outer.clientWidth + 1;
      setOverflowing(over);
      if (over && !centered) {
        outer.scrollLeft = (inner.scrollWidth - outer.clientWidth) / 2;
        centered = true;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      {overflowing && (
        <p className="text-xs text-ocean/50 text-center mb-2" aria-hidden>
          ← {scrollHint} →
        </p>
      )}
      <div ref={scrollRef} className="overflow-x-auto">
      <div ref={innerRef} className="w-max mx-auto px-2 py-1">
        <div className="flex flex-col items-center mb-6 select-none" aria-hidden>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-ocean/40 uppercase mb-1.5">
            {stageLabel}
          </span>
          <svg width="240" height="18" viewBox="0 0 240 18" className="text-ocean/20">
            <path d="M4 16 Q120 -8 236 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {(() => {
          const bySection = new Map<string, SeatMapRow[]>();
          for (const row of rows) {
            const section = row.section ?? "parter";
            bySection.set(section, [...(bySection.get(section) ?? []), row]);
          }
          const only = bySection.size === 1 && bySection.has("parter");
          const block = (section: string, curved: boolean) => {
            const sectionRows = bySection.get(section);
            if (!sectionRows) return null;
            return (
              <div key={section} className="flex flex-col items-center">
                {!only && (
                  <span className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ocean/40">{sectionTitle(section)}</span>
                )}
                {renderRows(sectionRows, curved)}
              </div>
            );
          };
          // Only the parter: drawn exactly as before sections existed.
          if (only) return renderRows(rows, true);
          // The parter faces the stage with the side sections beside it; the balcony sits behind.
          return (
            <>
              <div className="flex items-start justify-center gap-8">
                {block("left", false)}
                {block("parter", true)}
                {block("right", false)}
              </div>
              {bySection.has("balcony") && (
                <div className="mt-8 pt-6 border-t border-dashed border-ocean/15">{block("balcony", true)}</div>
              )}
            </>
          );
        })()}

      </div>
      </div>

      {/* Outside the scrolling box: the legend must stay in view however far the hall is scrolled. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-4 px-2 border-t border-cream-dark text-xs text-ocean/60">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full ${item.swatchClassName}`} />
              {item.label}
            </span>
          ))}
      </div>
    </div>
  );

  function renderRows(blockRows: SeatMapRow[], curved: boolean) {
    return (
        <div className="space-y-2">
          {blockRows.map((row, rowIndex) => {
            const { slots, width } = layoutRow(row.seats);
            // Row 0 is closest to the stage and stays almost flat; later rows
            // curve more at the edges — an amphitheater, not a true circle.
            // Side sections stay straight: they run alongside the parter.
            const curvature = curved && blockRows.length > 1 ? rowIndex / (blockRows.length - 1) : 0;
            const center = width / 2;

            return (
              <div key={`${row.section ?? "parter"}:${row.label}`} className="flex items-center gap-2.5">
                {onRowLabelClick ? (
                  <button
                    type="button"
                    onClick={() => onRowLabelClick(row)}
                    title={`Выбрать весь ряд ${row.label}`}
                    className="sticky left-0 z-10 bg-white w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40 hover:text-ocean-dark hover:underline cursor-pointer"
                  >
                    {row.label}
                  </button>
                ) : (
                  <span className="sticky left-0 z-10 bg-white w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40">
                    {row.label}
                  </span>
                )}

                <div className="flex items-end gap-2 py-1">
                  {slots.map((slot) => {
                    if (slot.kind === "aisle") {
                      return <span key={slot.key} style={{ width: AISLE_WIDTH }} className="shrink-0" />;
                    }

                    const seat = slot.seat;
                    const dist = center > 0 ? Math.abs(slot.x + SEAT_SIZE / 2 - center) / center : 0;
                    const lift = MAX_LIFT * curvature * dist * dist;
                    const variant = seatVariant(seat);

                    return (
                      <div key={slot.key} style={{ transform: `translateY(-${lift}px)` }}>
                        <button
                          type="button"
                          disabled={variant.disabled}
                          title={seatTooltip?.(seat)}
                          onClick={() => onSeatClick?.(seat)}
                          style={{ width: SEAT_SIZE, height: SEAT_SIZE }}
                          className={`rounded-full flex items-center justify-center text-[10px] font-bold leading-none transition-colors ${
                            variant.className
                          } ${variant.disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {seat.seatNumber}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {onRowLabelClick ? (
                  <button
                    type="button"
                    onClick={() => onRowLabelClick(row)}
                    title={`Выбрать весь ряд ${row.label}`}
                    className="w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40 hover:text-ocean-dark hover:underline cursor-pointer"
                  >
                    {row.label}
                  </button>
                ) : (
                  <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40">
                    {row.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
    );
  }
}
