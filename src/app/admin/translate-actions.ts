"use server";

import { getStaffIdentity } from "@/lib/profile";
import { translateBatch, type TranslateLang } from "@/lib/translate";

export type TranslateItem = {
  /** The name of the field this translation is destined for — echoed back so the
   *  caller can match results to inputs without relying on array order. */
  id: string;
  text: string;
  from: TranslateLang;
  to: TranslateLang;
};

export type TranslateResult = { id: string; text: string } | { id: string; error: string };

/**
 * Translates several fields in one round trip, for the single «Перевести пустые
 * поля» button that replaced a translate link under every field pair.
 *
 * Requires a staff session: the call is metered on our Google Cloud project, and
 * an unauthenticated endpoint that spends someone else's quota on request is worth
 * guarding even before the free tier is anywhere near used up.
 *
 * Items are grouped by direction (kk→ru vs ru→kk) so a form with several fields
 * going the same way becomes one API call, not one per field.
 */
export async function translateFields(items: TranslateItem[]): Promise<TranslateResult[]> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return items.map((item) => ({ id: item.id, error: "Не авторизовано" }));

  const groups = new Map<string, TranslateItem[]>();
  for (const item of items) {
    const key = `${item.from}:${item.to}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const results: TranslateResult[] = [];
  for (const [key, group] of groups) {
    const [from, to] = key.split(":") as [TranslateLang, TranslateLang];
    try {
      const translated = await translateBatch(
        group.map((item) => item.text),
        from,
        to
      );
      group.forEach((item, index) => results.push({ id: item.id, text: translated[index] ?? "" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка перевода";
      group.forEach((item) => results.push({ id: item.id, error: message }));
    }
  }
  return results;
}
