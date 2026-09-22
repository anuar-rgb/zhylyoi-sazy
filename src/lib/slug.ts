/**
 * Public addresses built from Kazakh and Russian titles.
 *
 * Keeping only [a-z0-9] would turn «Мерекелік концерт» into an empty string, so a
 * title in either language would never produce an address and the form would demand
 * one typed by hand in Latin. Transliterating first means a real title yields a real
 * address: «Мерекелік концерт» becomes "merekelik-kontsert".
 *
 * The mapping follows the addresses the site already uses: қ and к both become k, ө
 * becomes o, and ё becomes e — the existing address "bi-vokal-otchet" comes from
 * «отчёт». Changing that now would break links that are already out there.
 */
const TRANSLITERATION: Record<string, string> = {
  а: "a", ә: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "i", к: "k", қ: "k", л: "l", м: "m", н: "n",
  ң: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u",
  ү: "u", ф: "f", х: "h", һ: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", і: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

/**
 * A safe public address, or an empty string when nothing usable remains.
 *
 * Applied to a typed address as well as a generated one: an address is part of a URL
 * that people copy and send each other, so it should not contain spaces or letters
 * that turn into percent-escapes when shared.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => TRANSLITERATION[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    // A trailing hyphen can reappear after the length cut.
    .replace(/-+$/g, "");
}
