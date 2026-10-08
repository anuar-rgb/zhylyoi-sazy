"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { takeHallDefaults } from "./actions";

/** Brings the hall's VIP seats and default prices back into this event, after a confirmation. */
export default function TakeHallDefaultsButton({ eventId, hallName }: { eventId: string; hallName: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const confirmed = await feedback.confirm({
      title: "Взять места и цены из зала?",
      message: `Категории мест этого мероприятия станут такими же, как в зале «${hallName}», а цены — ценами зала по умолчанию. Уже проданные билеты не изменятся.`,
      confirmLabel: "Взять из зала",
    });
    if (!confirmed) return;
    setBusy(true);
    const result = await takeHallDefaults(eventId);
    setBusy(false);
    if (result.ok) {
      feedback.success(
        result.prices > 0
          ? `Готово: VIP и другие места — ${result.seats}, цен — ${result.prices}`
          : `Места взяты из зала (${result.seats}). У зала нет цен по умолчанию`
      );
      router.refresh();
    } else {
      feedback.error("Не удалось взять места и цены из зала.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-sm font-semibold text-ocean border border-cream-dark rounded-full px-4 py-2 hover:bg-cream hover:text-gold-dark transition-colors disabled:opacity-50"
    >
      {busy ? "…" : "Взять места и цены из зала"}
    </button>
  );
}
