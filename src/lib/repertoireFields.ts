/**
 * Categories of a repertoire piece.
 *
 * Client-safe: the admin form and the public page both read this, and neither may
 * pull the server-only data layer in.
 *
 * The database stores the code, never the label. The page used to colour the badge
 * by looking the displayed word up in a map — "Кюй" and "Күй" both had entries —
 * so an administrator typing "Кюи" would have silently lost the colour. A code
 * cannot be mistyped into nothing: it comes from a list.
 *
 * "other" exists so a piece that fits none of these is still enterable without
 * waiting for a developer. It takes the neutral colour.
 */
export const REPERTOIRE_CATEGORIES = [
  "kui",
  "folk_song",
  "song",
  "classical",
  "terme",
  "original",
  "other",
] as const;

export type RepertoireCategory = (typeof REPERTOIRE_CATEGORIES)[number];

/** What the visitor reads on the badge, in their own language. */
export const REPERTOIRE_CATEGORY_LABELS: Record<RepertoireCategory, { kk: string; ru: string }> = {
  kui: { kk: "Күй", ru: "Кюй" },
  folk_song: { kk: "Халық әні", ru: "Народная песня" },
  song: { kk: "Ән", ru: "Песня" },
  classical: { kk: "Классика", ru: "Классика" },
  terme: { kk: "Терме", ru: "Терме" },
  original: { kk: "Авторлық", ru: "Авторская" },
  other: { kk: "Басқа", ru: "Другое" },
};

/** What the administrator picks from. One language: the panel is not localized. */
export const REPERTOIRE_CATEGORY_ADMIN_LABELS: Record<RepertoireCategory, string> = {
  kui: "Кюй",
  folk_song: "Народная песня",
  song: "Песня",
  classical: "Классика",
  terme: "Терме",
  original: "Авторская",
  other: "Другое",
};

export const REPERTOIRE_CATEGORY_COLORS: Record<RepertoireCategory, string> = {
  kui: "bg-gold/15 text-gold-dark border-gold/30",
  folk_song: "bg-ocean/10 text-ocean border-ocean/20",
  song: "bg-ocean/10 text-ocean border-ocean/20",
  classical: "bg-blue-50 text-blue-700 border-blue-200",
  terme: "bg-amber-50 text-amber-700 border-amber-200",
  original: "bg-emerald-50 text-emerald-700 border-emerald-200",
  other: "bg-ocean/5 text-ocean/60 border-ocean/15",
};

/** A stored value that is not a known code reads as "other" rather than breaking the page. */
export function asRepertoireCategory(value: string | null): RepertoireCategory {
  return REPERTOIRE_CATEGORIES.includes(value as RepertoireCategory) ? (value as RepertoireCategory) : "other";
}
