"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventPaymentMethod } from "./actions";
import type { PaymentMethodRecord } from "@/lib/paymentMethods";

export default function EventPaymentMethodPicker({
  eventId,
  methods,
  currentId,
}: {
  eventId: string;
  methods: PaymentMethodRecord[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null;
    setBusy(true);
    setError(null);
    const result = await updateEventPaymentMethod(eventId, value);
    setBusy(false);
    if (result.ok) router.refresh();
    else setError("Не удалось сохранить.");
  }

  return (
    <div>
      <select
        defaultValue={currentId ?? ""}
        onChange={handleChange}
        disabled={busy}
        className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
      >
        <option value="">Все включённые способы (по умолчанию)</option>
        {methods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.displayNameRu ?? method.displayNameKk ?? method.providerName}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
