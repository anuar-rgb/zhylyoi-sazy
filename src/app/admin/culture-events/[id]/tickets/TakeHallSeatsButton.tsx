"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { takeHallSeats } from "./actions";

/** Brings the hall's VIP (and other category) seats back into this event, after a confirmation. */
export default function TakeHallSeatsButton({ eventId, hallName }: { eventId: string; hallName: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const confirmed = await feedback.confirm({
      title: "Взять места из зала?",
      message: `Категории мест этого мероприятия станут такими же, как в зале «${hallName}». Цены не изменятся, уже проданные билеты тоже.`,
      confirmLabel: "Взять из зала",
    });
    if (!confirmed) return;
    setBusy(true);
    const result = await takeHallSeats(eventId);
    setBusy(false);
    if (result.ok) {
      feedback.success(`Места взяты из зала: VIP и других — ${result.seats}`);
      router.refresh();
    } else {
      feedback.error("Не удалось взять места из зала.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-sm font-semibold text-ocean border border-cream-dark rounded-full px-4 py-2 hover:bg-cream hover:text-gold-dark transition-colors disabled:opacity-50"
    >
      {busy ? "…" : "Взять места из зала"}
    </button>
  );
}
