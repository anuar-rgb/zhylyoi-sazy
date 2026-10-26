"use client";

import { useActionState, useState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import EventPriceFields from "../../EventPriceFields";
import { updateEventPrices, type FormState } from "./actions";

/** Same price, however it is typed: «500», «500.0» and 500 match; an empty field is "not on sale". */
function samePrice(typed: string, saved: number | undefined): boolean {
  const value = typed.trim();
  if (value === "" || saved === undefined) return value === "" && saved === undefined;
  return Number(value) === saved;
}

/** The event's price per seat category, the same fields as on the event's own form. */
export default function EventPricesForm({
  eventId,
  categories,
  prices,
}: {
  eventId: string;
  categories: string[];
  prices: Record<string, number>;
}) {
  // The button shows only once a price differs from what is saved, and hides again after a
  // successful save; a failed one keeps it, so the change can be saved again.
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await updateEventPrices(prev, form);
    if (!result.error) setDirty(false);
    return result;
  }, { error: null });
  useActionToast(state, "Цены сохранены");

  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    setDirty(categories.some((category) => !samePrice(String(data.get(`price:${category}`) ?? ""), prices[category])));
  }

  return (
    // Keyed on the data, so the fields show the saved values again after a refresh.
    <form
      key={JSON.stringify([categories, prices])}
      action={formAction}
      onChange={handleChange}
      className="space-y-4"
    >
      <input type="hidden" name="event_id" value={eventId} />
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}
      <EventPriceFields categories={categories} prices={prices} />
      {(dirty || pending) && (
        <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {pending ? "Сохранение…" : "Сохранить цены"}
        </button>
      )}
    </form>
  );
}
