"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { retryEventCancellation } from "@/app/admin/culture-events/actions";

/**
 * The top of a cancelled event's report: when and why, and the paid orders whose money the bank
 * has not returned yet, with a button to try again now (the site also retries by itself).
 */
export default function CancelledNotice({
  eventId,
  cancelledAt,
  reason,
  notRefunded,
}: {
  eventId: string;
  /** Already formatted for display. */
  cancelledAt: string;
  reason: string | null;
  /** Order numbers still holding the buyer's money. */
  notRefunded: string[];
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    const result = await retryEventCancellation(eventId);
    setBusy(false);
    if (result.ok) feedback.success(result.message);
    else feedback.error(result.message);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/60 p-4 sm:p-5 mb-6">
      <p className="font-semibold text-red-700">Мероприятие отменено {cancelledAt}</p>
      {reason && <p className="text-sm text-red-700/80 mt-0.5">Причина: {reason}</p>}
      {notRefunded.length === 0 ? (
        <p className="text-sm text-ocean/70 mt-2">Деньги по всем оплаченным заказам возвращены, покупатели получили письма.</p>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ocean/80">
            Банк ещё не вернул деньги по {notRefunded.length === 1 ? "заказу" : "заказам"}: {notRefunded.join(", ")}. Сайт повторяет
            возврат сам каждые 10 минут; письмо покупателю уйдёт, когда деньги вернутся.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void retry()}
            className="px-4 py-2 rounded-full text-xs font-semibold border border-red-200 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy ? "…" : "Повторить возврат сейчас"}
          </button>
        </div>
      )}
    </div>
  );
}
