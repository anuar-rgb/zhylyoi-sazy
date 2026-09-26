"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleEnabled() {
    setBusy(true);
    setError(null);
    const result = await setPaymentMethodEnabled(id, !isEnabled);
    setBusy(false);
    if (result.ok) router.refresh();
    else setError("Не удалось сохранить.");
  }

  async function handleSetDefault() {
    setBusy(true);
    setError(null);
    const result = await setPaymentMethodDefault(id);
    setBusy(false);
    if (result.ok) router.refresh();
    else setError("Не удалось сохранить.");
  }

  async function handleDelete() {
    if (!confirm(`Удалить способ оплаты «${providerName}»?`)) return;
    setBusy(true);
    setError(null);
    const result = await deletePaymentMethod(id);
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.error ?? "Не удалось удалить.");
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
