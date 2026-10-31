/**
 * A row set up on its own (hall_row_layouts): fewer seats than its section, and where they stand.
 * Pure, with no database access, so the seat map in the browser can use it as well.
 */

/** How one row stands within its section's full width. */
export type RowAlignment = "center" | "left" | "right" | "custom";

export const ROW_ALIGNMENTS: readonly RowAlignment[] = ["center", "left", "right", "custom"];

/** Which end of a row seat 1 is drawn at: the left (as always) or the right. Never changes a seat's number. */
export type SeatNumbering = "ltr" | "rtl";

export function toSeatNumbering(value: unknown): SeatNumbering | null {
  return value === "rtl" || value === "ltr" ? value : null;
}

/** What the seat map needs to draw a row: where it stands, and (when set) its own numbering direction. */
export type RowPlacement = { alignment: RowAlignment; offsetStart: number; numbering?: SeatNumbering | null };

/** Row placements keyed by rowLayoutKey. A row missing here is centred, as before. */
export type RowPlacements = Record<string, RowPlacement>;

/** The key a row's layout is looked up by. */
export function rowLayoutKey(section: string, rowLabel: string): string {
  return `${section}:${rowLabel}`;
}

export function toRowAlignment(value: unknown): RowAlignment {
  return ROW_ALIGNMENTS.find((alignment) => alignment === value) ?? "center";
}
