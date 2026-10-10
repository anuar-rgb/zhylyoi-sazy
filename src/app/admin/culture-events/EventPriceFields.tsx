"use client";

import { assignCategoryColors } from "@/components/SeatMap";
import { categoryLabel } from "@/lib/seatCategories";

const INPUT =
  "w-full px-4 py-2 pr-9 border border-cream-dark rounded-2xl bg-cream/30 text-base sm:text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";

/**
 * One price field per seat category of the event's hall, named "price:<category>" for
 * parseEventPrices. The hall only says which categories there are; the price is this event's.
 * The parent keys this on the hall, so choosing another hall starts from that hall's list.
 */
export default function EventPriceFields({
  categories,
  prices,
}: {
  categories: string[];
  /** category -> price the event already has (0 = free); a category missing here is not on sale. */
  prices: Record<string, number>;
}) {
  const colors = assignCategoryColors(categories);

  return (
    <div>
      <ul className="divide-y divide-cream-dark">
        {categories.map((category) => {
          const color = colors.get(category)?.solid.split(" ")[0] ?? "bg-ocean";
          const label = categoryLabel(category);
          return (
            <li key={category} className="py-2.5 first:pt-0 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className={`inline-block w-3.5 h-3.5 rounded-full shrink-0 ${color}`} aria-hidden />
                <span className="font-semibold text-ocean break-words">{label}</span>
              </span>
              <span className="relative w-36 shrink-0">
                <input
                  name={`price:${category}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  defaultValue={prices[category] ?? ""}
                  placeholder="цена"
                  aria-label={`Цена: ${label}`}
                  className={INPUT}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ocean/40">₸</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ocean/40 mt-3">
        Цена одного места для этого мероприятия. 0 — бесплатно. Пустое поле — места этой категории не продаются.
      </p>
    </div>
  );
}
