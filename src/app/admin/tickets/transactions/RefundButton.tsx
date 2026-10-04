"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { markPaymentRefunded } from "./actions";

/** Asks first, and says plainly what it does and what it does not do. */
export default function RefundButton({ paymentId, orderNumber }: { paymentId: string; orderNumber: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const confirmed = await feedback.confirm({
      title: `Отметить возврат по заказу ${orderNumber}?`,
      message:
        "Нажимайте, только если деньги уже возвращены покупателю через кабинет банка. Сайт сам деньги не возвращает. " +
        "Заказ получит статус «возврат», места освободятся, билеты перестанут пропускать на входе.",
      confirmLabel: "Деньги возвращены",
      danger: true,
    });
    if (!confirmed) return;

    setBusy(true);
    const result = await markPaymentRefunded(paymentId);
    setBusy(false);
    if (result.ok) {
      feedback.success("Возврат отмечен");
      router.refresh();
    } else {
      feedback.error(result.error ?? "Не удалось отметить возврат.");
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="text-xs font-semibold text-red-700 border border-red-200 rounded-full px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {busy ? "…" : "Отметить возврат"}
    </button>
  );
}
