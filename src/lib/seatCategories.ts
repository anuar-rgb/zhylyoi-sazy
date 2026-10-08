/**
 * Seat categories: the two every hall offers (Стандарт and VIP) plus any the staff add.
 *
 * Stored as plain text in hall_seats.category, event_seat_categories.category and
 * event_ticket_types.category; "standard" and "vip" are the stored values of the two built-in
 * ones and are shown by their names here. Safe to import from client components.
 */
export const STANDARD = "standard";
export const VIP = "vip";

const NAMES: Record<string, { ru: string; kk: string }> = {
  [STANDARD]: { ru: "Стандарт", kk: "Стандарт" },
  [VIP]: { ru: "VIP", kk: "VIP" },
};

/** What a person reads for a stored category: "Стандарт", "VIP", or the custom name as typed. */
export function categoryLabel(category: string, locale: "ru" | "kk" = "ru"): string {
  return NAMES[category]?.[locale] ?? category;
}

/** Стандарт and VIP always first, then the custom categories already in use, alphabetically. */
export function categoryOptions(inUse: Iterable<string>): string[] {
  const custom = [...new Set(inUse)].filter((c) => c !== STANDARD && c !== VIP).sort((a, b) => a.localeCompare(b, "ru"));
  return [STANDARD, VIP, ...custom];
}
