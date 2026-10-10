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

/** Spellings people type for the two built-in categories, in any case. */
const ALIASES: Record<string, string> = {
  vip: VIP,
  "вип": VIP,
  "в.и.п.": VIP,
  standard: STANDARD,
  standart: STANDARD,
  "стандарт": STANDARD,
  "стандартный": STANDARD,
};

/**
 * One stored value per category, whatever was typed: «вип», «VIP» and «Vip» are all VIP,
 * «стандарт» is Стандарт, and a custom name matching an existing one apart from case or spaces
 * («Балкон» / «балкон ») becomes that existing one. Returns null for an empty name.
 */
export function normalizeCategory(raw: string, existing: Iterable<string> = []): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return null;
  const key = name.toLocaleLowerCase("ru");
  if (ALIASES[key]) return ALIASES[key];
  for (const category of existing) {
    if (category.trim().toLocaleLowerCase("ru") === key) return category;
  }
  return name;
}

export function isBuiltInCategory(category: string): boolean {
  return category === STANDARD || category === VIP;
}

/** Стандарт and VIP always first, then the custom categories already in use, alphabetically. */
export function categoryOptions(inUse: Iterable<string>): string[] {
  const custom = [...new Set(inUse)].filter((c) => c !== STANDARD && c !== VIP).sort((a, b) => a.localeCompare(b, "ru"));
  return [STANDARD, VIP, ...custom];
}
