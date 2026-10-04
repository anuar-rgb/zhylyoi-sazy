"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

const SCENARIOS: { id: string; label: string; hint: string; tone?: "primary" | "danger" }[] = [
  { id: "success", label: "Оплатить", hint: "Банк подтверждает оплату", tone: "primary" },
  { id: "failed", label: "Отказ банка", hint: "payment.failed", tone: "danger" },
  { id: "cancelled", label: "Отмена покупателем", hint: "payment.cancelled" },
  { id: "processing", label: "Платёж обрабатывается", hint: "payment.processing" },
  { id: "duplicate", label: "Дубли уведомления ×3", hint: "одно уведомление три раза" },
  { id: "wrong_amount", label: "Неверная сумма", hint: "должно быть отклонено" },
  { id: "wrong_currency", label: "Неверная валюта", hint: "должно быть отклонено" },
  { id: "invalid_signature", label: "Неверная подпись", hint: "должно быть отклонено" },
  { id: "stale_timestamp", label: "Старое сообщение (повтор)", hint: "должно быть отклонено" },
  { id: "unknown_payment", label: "Неизвестный платёж", hint: "должно быть отклонено" },
  { id: "lost_webhook", label: "Оплатил, но уведомление потерялось", hint: "потом сработает сверка" },
  { id: "refund", label: "Возврат", hint: "payment.refunded" },
];

/** DEVELOPMENT ONLY: buttons that make the pretend bank say each thing a real bank might. */
export default function MockBankClient({ paymentId, orderToken }: { paymentId: string; orderToken: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function play(id: string) {
    setBusy(id);
    const res = await fetch("/api/dev/payments/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, scenario: id }),
    });
    const data = (await res.json().catch(() => null)) as { steps?: { status: number; body: unknown }[]; error?: string } | null;
    const line = data?.steps
      ? data.steps.map((s) => `${s.status} ${JSON.stringify(s.body)}`).join("  |  ")
      : `ошибка: ${data?.error ?? res.status}`;
    setLog((current) => [`${id}: ${line}`, ...current].slice(0, 8));
    setBusy(null);
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy !== null}
            onClick={() => play(s.id)}
            title={s.hint}
            className={`text-left rounded-2xl px-4 py-3 text-sm font-semibold border transition-colors disabled:opacity-50 ${
              s.tone === "primary"
                ? "bg-ocean text-white border-ocean hover:bg-ocean-dark"
                : s.tone === "danger"
                  ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                  : "bg-white text-ocean border-cream-dark hover:bg-cream"
            }`}
          >
            {s.label}
            <span className="block text-xs font-normal opacity-60">{s.hint}</span>
          </button>
        ))}
      </div>

      {log.length > 0 && (
        <ul className="mt-5 space-y-1 text-xs text-ocean/70 break-all" aria-live="polite">
          {log.map((line, i) => (
            <li key={`${i}-${line}`} className="bg-cream/40 rounded-xl px-3 py-2">
              {line}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href={`/payment/success?order=${orderToken}`} className="btn-primary px-5 py-2.5">
          Вернуться на сайт
        </Link>
        <Link href={`/payment/failure?order=${orderToken}`} className="px-5 py-2.5 text-ocean/60 hover:text-ocean">
          Вернуться как после отказа
        </Link>
      </div>
    </div>
  );
}
