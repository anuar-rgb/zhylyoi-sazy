"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmBookingPayment } from "./actions";

export default function ConfirmPaymentButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const result = await confirmBookingPayment(id);
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.error ?? "Не удалось подтвердить.");
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {busy ? "…" : "Подтвердить оплату"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[200px]">{error}</p>}
    </div>
  );
}
