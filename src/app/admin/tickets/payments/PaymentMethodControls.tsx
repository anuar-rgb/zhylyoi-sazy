"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { deletePaymentMethod, setPaymentMethodDefault, setPaymentMethodEnabled } from "./actions";

export default function PaymentMethodControls({
  id,
  providerName,
  isEnabled,
  isDefault,
}: {
  id: string;
  providerName: string;
  isEnabled: boolean;
  isDefault: boolean;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleEnabled() {
    setBusy(true);
    setError(null);
    const result = await setPaymentMethodEnabled(id, !isEnabled);
    setBusy(false);
    if (result.ok) {
      feedback.success(isEnabled ? "Способ оплаты выключен" : "Способ оплаты включён");
      router.refresh();
    } else {
      setError("Не удалось сохранить.");
      feedback.error("Не удалось сохранить.");
    }
  }

  async function handleSetDefault() {
    setBusy(true);
    setError(null);
    const result = await setPaymentMethodDefault(id);
    setBusy(false);
    if (result.ok) {
      feedback.success("Способ оплаты выбран по умолчанию");
      router.refresh();
    } else {
      setError("Не удалось сохранить.");
      feedback.error("Не удалось сохранить.");
    }
  }

  async function handleDelete() {
    const confirmed = await feedback.confirm({
      title: `Удалить способ оплаты «${providerName}»?`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await deletePaymentMethod(id);
    setBusy(false);
    if (result.ok) {
      feedback.success("Удалено");
      router.refresh();
    } else {
      const message = result.error ?? "Не удалось удалить.";
      setError(message);
      feedback.error(message);
    }
  }

  return (
    <div className="text-right">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {!isDefault && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={busy}
            className="text-xs font-semibold text-ocean/50 hover:text-ocean transition-colors disabled:opacity-50"
          >
            Сделать по умолчанию
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleEnabled}
          disabled={busy}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
            isEnabled ? "bg-gold/15 text-ocean-dark hover:bg-gold/25" : "bg-ocean/5 text-ocean/50 hover:bg-ocean/10"
          }`}
        >
          {isEnabled ? "Включено" : "Выключено"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="text-xs font-semibold text-ocean/40 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          Удалить
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
