"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import EventPriceFields from "../../EventPriceFields";
import { updateEventPrices, type FormState } from "./actions";

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
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateEventPrices, { error: null });
  useActionToast(state, "Цены сохранены");

  return (
    // Keyed on the data, so the fields show the saved values again after a refresh.
    <form key={JSON.stringify([categories, prices])} action={formAction} className="space-y-4">
      <input type="hidden" name="event_id" value={eventId} />
      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}
      <EventPriceFields categories={categories} prices={prices} />
      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить цены"}
      </button>
    </form>
  );
}
