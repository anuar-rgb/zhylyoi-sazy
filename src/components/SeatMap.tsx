"use client";

/**
 * Pure presentation: one row of seats in, one row of circles out. The
 * component never fetches or interprets data — status is whatever string the
 * caller passes (public: available/selected/taken; admin: active/inactive),
 * and seatVariant() is the caller's translation of that into a look.
 */
export interface SeatMapSeat {
  id: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  status: string;
}

export interface SeatMapRow {
  label: string;
  seats: SeatMapSeat[];
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
 * Deterministic small palette for admin category colouring, assigned by order
 * of first appearance among the categories actually present — not a hash.
 * A hash can put two categories one shade apart, or reassign colours when a
 * third category is added; an ordered palette stays stable and distinct as
 * categories are added over time.
 */
const CATEGORY_PALETTE = [
  "bg-ocean text-cream",
  "bg-gold text-ocean-dark",
  "bg-ocean-dark text-cream",
  "bg-gold-dark text-cream",
  "bg-ocean-light text-cream",
  "bg-gold-light text-ocean-dark",
];

export function assignCategoryColors(categories: string[]): Map<string, string> {
  const map = new Map<string, string>();
  Array.from(new Set(categories)).forEach((category, i) => {
    map.set(category, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]);
  });
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
}: SeatMapProps) {
  return (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <div className="w-max mx-auto px-2 py-1">
        <div className="flex flex-col items-center mb-6 select-none" aria-hidden>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-ocean/40 uppercase mb-1.5">
            {stageLabel}
          </span>
          <svg width="240" height="18" viewBox="0 0 240 18" className="text-ocean/20">
            <path d="M4 16 Q120 -8 236 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="space-y-2">
          {rows.map((row, rowIndex) => {
            const { slots, width } = layoutRow(row.seats);
            // Row 0 is closest to the stage and stays almost flat; later rows
            // curve more at the edges — an amphitheater, not a true circle.
            const curvature = rows.length > 1 ? rowIndex / (rows.length - 1) : 0;
            const center = width / 2;

            return (
              <div key={row.label} className="flex items-center gap-2.5">
                <span className="sticky left-0 z-10 bg-white w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40">
                  {row.label}
                </span>

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

                <span className="sticky right-0 z-10 bg-white w-5 shrink-0 text-center text-[11px] font-semibold text-ocean/40">
                  {row.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-cream-dark text-xs text-ocean/60">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full ${item.swatchClassName}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
