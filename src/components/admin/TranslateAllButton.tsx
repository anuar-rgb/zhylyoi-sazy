"use client";

import { useState } from "react";
import { translateFields, type TranslateItem } from "@/app/admin/translate-actions";

function fieldOf(form: HTMLFormElement, name: string): HTMLInputElement | HTMLTextAreaElement | null {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) return field;
  return null;
}

/**
 * One button that fills every empty side of every kk/ru field pair on the form,
 * instead of a "Перевести: каз → рус · рус → каз" link repeated under each pair.
 *
 * Only a pair with text on exactly one side is touched: an empty pair has nothing
 * to translate from, and a pair already filled on both sides likely holds a human
 * translation that a machine one would only downgrade. Values are written straight
 * onto the DOM inputs — these fields are uncontrolled, read only at submit time —
 * so nothing here needs the surrounding form to be aware of it.
 */
export default function TranslateAllButton({ pairs }: { pairs: { kk: string; ru: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const items: TranslateItem[] = [];
    for (const pair of pairs) {
      const kkField = fieldOf(form, pair.kk);
      const ruField = fieldOf(form, pair.ru);
      if (!kkField || !ruField) continue;

      const kkText = kkField.value.trim();
      const ruText = ruField.value.trim();
      if (kkText && !ruText) items.push({ id: pair.ru, text: kkText, from: "kk", to: "ru" });
      else if (ruText && !kkText) items.push({ id: pair.kk, text: ruText, from: "ru", to: "kk" });
    }

    if (items.length === 0) {
      setMessage("Переводить нечего: в каждой паре либо обе стороны пустые, либо уже заполнены.");
      return;
    }

    setBusy(true);
    setMessage(null);

    const results = await translateFields(items);
    let done = 0;
    let failed = 0;
    for (const result of results) {
      const field = fieldOf(form, result.id);
      if (!field) continue;
      if ("error" in result) failed += 1;
      else {
        field.value = result.text;
        done += 1;
      }
    }

    setBusy(false);
    setMessage(failed > 0 ? `Переведено полей: ${done}, не удалось: ${failed}.` : `Переведено полей: ${done}.`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs font-semibold text-ocean/60 border border-cream-dark rounded-full px-3 py-1.5 hover:bg-cream hover:text-gold-dark transition-colors disabled:opacity-50"
      >
        {busy ? "Перевожу…" : "Перевести пустые поля"}
      </button>
      {message && <span className="text-xs text-ocean/40">{message}</span>}
    </div>
  );
}
