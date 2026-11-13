/**
 * An order number as staff type it from a phone call, made into the stored form: "DK-000154".
 * "154", "dk154", "DK 000154" and "дк-154" (Cyrillic, a keyboard left in Russian) all mean the
 * same order. Null when there are no digits to go by.
 */
export function normalizeOrderNumber(input: string): string | null {
  const text = input.trim().toUpperCase().replace(/Д/g, "D").replace(/К/g, "K");
  const match = text.match(/^(?:DK)?[\s-]*0*(\d{1,9})$/);
  if (!match) return null;
  const digits = match[1];
  return `DK-${digits.padStart(6, "0")}`;
}
