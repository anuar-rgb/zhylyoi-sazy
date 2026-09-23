import "server-only";
import { unstable_cache } from "next/cache";
import { translateText, type TranslateLang } from "@/lib/translate";

/**
 * Machine-translates missing halves of public content on the fly, so a visitor
 * never gets Russian words on the Kazakh page (or the reverse) just because the
 * institution filled in only one language.
 *
 * This complements, not replaces, the «Перевести пустые поля» button in the
 * admin panel: that button fills the database when staff remember to press it;
 * this fills the gap at render time for whatever they didn't.
 *
 * Results are cached by Next's Data Cache for 30 days, keyed on the exact text —
 * an institution edits its pages rarely, so almost every real visit is a cache
 * hit costing no network call. A cache miss or a translator failure (missing key,
 * quota, network) falls back to leaving the field as it was: null stays null,
 * exactly today's behaviour, never a crash.
 */
const cachedTranslate = unstable_cache(
  async (text: string, from: TranslateLang, to: TranslateLang) => translateText(text, from, to),
  ["auto-translate"],
  { revalidate: 60 * 60 * 24 * 30 }
);

export async function safeTranslate(text: string, from: TranslateLang, to: TranslateLang): Promise<string | null> {
  try {
    const result = await cachedTranslate(text, from, to);
    return result.trim().length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Fills one kk/ru field pair across a batch of records — a shallow copy is
 * returned, the input array is untouched. Only a pair with text on exactly one
 * side is translated; a pair already filled on both sides, or empty on both, is
 * returned unchanged and never reaches the translator.
 *
 * Used two ways: the public read functions below call it to decorate a render
 * without touching the database, and the admin create/update actions call it on
 * the form's own payload just before the insert/update — that is the one place
 * its result IS written down, which is what lets an admin form show only the
 * Kazakh field and have the Russian one filled in by saving.
 */
export async function translateFieldPair<T extends Record<string, unknown>>(
  records: T[],
  kkKey: Extract<keyof T, string>,
  ruKey: Extract<keyof T, string>
): Promise<T[]> {
  return Promise.all(
    records.map(async (record) => {
      const kk = record[kkKey] as string | null;
      const ru = record[ruKey] as string | null;

      if (kk && !ru) {
        const translated = await safeTranslate(kk, "kk", "ru");
        return translated ? { ...record, [ruKey]: translated } : record;
      }
      if (ru && !kk) {
        const translated = await safeTranslate(ru, "ru", "kk");
        return translated ? { ...record, [kkKey]: translated } : record;
      }
      return record;
    })
  );
}
