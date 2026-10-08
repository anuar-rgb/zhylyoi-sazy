/**
 * Hall sections: the parter in front of the stage, side rows on the left and right, and the
 * balcony. Rows and seats are numbered within each section, so a seat is named by its section
 * too («Балкон, ряд 2, место 5»). Stored in hall_seats.section. Safe to import from client
 * components.
 */
export const SECTIONS = ["parter", "left", "right", "balcony"] as const;
export type HallSection = (typeof SECTIONS)[number];
export const PARTER: HallSection = "parter";

const NAMES: Record<HallSection, { ru: string; kk: string }> = {
  parter: { ru: "Партер", kk: "Партер" },
  left: { ru: "Левый сектор", kk: "Сол жақ сектор" },
  right: { ru: "Правый сектор", kk: "Оң жақ сектор" },
  balcony: { ru: "Балкон", kk: "Балкон" },
};

export function isSection(value: unknown): value is HallSection {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

/** An unknown or missing value is the parter, which every seat was before sections existed. */
export function toSection(value: unknown): HallSection {
  return isSection(value) ? value : PARTER;
}

export function sectionLabel(section: string, locale: "ru" | "kk" = "ru"): string {
  return NAMES[toSection(section)][locale];
}

/** Order on the map and in lists: parter, left, right, balcony. */
export function sectionOrder(section: string): number {
  return SECTIONS.indexOf(toSection(section));
}

/**
 * A seat as a person reads it. The parter is left out when the hall has only the parter, so
 * existing halls keep reading «Ряд 3, место 5» exactly as before.
 */
export function seatName(
  seat: { section?: string | null; rowLabel: string; seatNumber: number },
  locale: "ru" | "kk" = "ru"
): string {
  const place = locale === "kk" ? `Қатар ${seat.rowLabel}, орын ${seat.seatNumber}` : `Ряд ${seat.rowLabel}, место ${seat.seatNumber}`;
  const section = toSection(seat.section);
  return section === PARTER ? place : `${sectionLabel(section, locale)} · ${place}`;
}
