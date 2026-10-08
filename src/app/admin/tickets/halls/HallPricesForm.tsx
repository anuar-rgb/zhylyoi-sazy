"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { categoryLabel } from "@/lib/seatCategories";
import { saveHallPrices, type FormState } from "./actions";

/**
 * The hall's default price for each seat category in use. A new event in this hall starts with
 * these prices; each event can then change its own.
 */
export default function HallPricesForm({
  hallId,
  categories,
  prices,
  seatCounts,
}: {
  hallId: string;
  categories: string[];
  prices: Record<string, number>;
  seatCounts: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveHallPrices, { error: null });
  useActionToast(state, "Цены сохранены");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={hallId} />
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {categories.map((category) => (
          <div key={category}>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor={`price-${category}`}>
              {categoryLabel(category)}{" "}
              <span className="text-ocean/40 font-normal">· {seatCounts[category] ?? 0} мест</span>
            </label>
            <div className="relative">
              <input
                id={`price-${category}`}
                name={`price:${category}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                defaultValue={prices[category] ?? ""}
                placeholder="не задана"
                className="w-full pl-4 pr-10 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ocean/40">₸</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ocean/40">
        0 — бесплатно. Пустое поле — цены нет, её зададут у мероприятия. Новое мероприятие в этом зале получит эти цены
        и VIP-места сразу; у уже созданных мероприятий цены не меняются, пока на их странице «Билеты» не нажать «Взять
        места и цены из зала».
      </p>

      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить цены"}
      </button>
    </form>
  );
}
