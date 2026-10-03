"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { deleteEvent } from "./actions";

export default function DeleteEventButton({
  id,
  title,
  redirectHref,
  bookingCount = 0,
}: {
  id: string;
  title: string;
  /** From the event editor: nowhere left on this page once it's gone, so navigate away instead of refreshing in place. Omitted on a list, which just refreshes without the deleted row. */
  redirectHref?: string;
  /** Active (pending/confirmed) bookings against this event — bookings.event_id cascades on delete, so they'd be gone too, silently, without a louder warning than the plain-event one below. */
  bookingCount?: number;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = await feedback.confirm(
      bookingCount > 0
        ? {
            title: `Удалить мероприятие «${title}»?`,
            message:
              `У него есть ${bookingCount} ${bookingCount === 1 ? "бронь" : "броней"} (оплаты, билеты). ` +
              `Они удалятся вместе с мероприятием, отменить это будет нельзя.`,
            confirmLabel: "Удалить",
            danger: true,
          }
        : {
            title: `Удалить мероприятие «${title}»?`,
            message: "Страница исчезнет с сайта.",
            confirmLabel: "Удалить",
            danger: true,
          }
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);

    const result = await deleteEvent(id);
    setBusy(false);

    // A delete the caller has no rights for removes zero rows without erroring,
    // so without this the row would stay put and look like a glitch.
    if (result.ok) {
      feedback.success("Удалено");
      if (redirectHref) router.push(redirectHref);
      else router.refresh();
    } else {
      const message = result.error ?? "Не удалось удалить.";
      setError(message);
      feedback.error(message);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-xs font-semibold text-ocean/40 hover:text-red-600 transition-colors disabled:opacity-50"
      >
        Удалить
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[180px]">{error}</p>}
    </div>
  );
}
