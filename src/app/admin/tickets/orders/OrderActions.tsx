"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import type { BookingStatus } from "@/lib/bookingStatus";
import {
  confirmOrderPayment,
  issueLateOrder,
  markOrderLate,
  markOrderRefunded,
  rejectOrder,
  type OrderActionResult,
} from "./actions";

const INPUT =
  "w-full px-3 py-2 border border-cream-dark rounded-xl bg-white text-base sm:text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const PRIMARY = "btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-50";
const SECONDARY =
  "px-4 py-2 rounded-full text-xs font-semibold border border-cream-dark text-ocean hover:bg-cream/60 transition-colors disabled:opacity-50";
const DANGER =
  "px-4 py-2 rounded-full text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50";

export type OrderSummary = {
  id: string;
  status: BookingStatus;
  orderNumber: string;
  eventTitle: string;
  tickets: number;
  amountText: string;
  buyerName: string;
  buyerPhone: string;
};

type Mode = null | "reject" | "late" | "refund";

/**
 * What the cashier can do with one order, by its status. Every action asks first, showing what
 * it is about to do (event, tickets, sum, buyer), and only reports success when the database
 * function said so; on an error the order stays exactly as it was.
 */
export default function OrderActions({ order }: { order: OrderSummary }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [operationId, setOperationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary =
    `Заказ ${order.orderNumber}\n${order.eventTitle || "Мероприятие"}\n` +
    `Билетов: ${order.tickets} · Сумма: ${order.amountText}\n${order.buyerName} · ${order.buyerPhone}`;

  async function act(
    ask: { title: string; confirmLabel: string; danger?: boolean; extra?: string },
    action: () => Promise<OrderActionResult>
  ) {
    const confirmed = await feedback.confirm({
      title: ask.title,
      message: ask.extra ? `${summary}\n\n${ask.extra}` : summary,
      confirmLabel: ask.confirmLabel,
      danger: ask.danger,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      feedback.success(result.message);
      setMode(null);
      setNote("");
      router.refresh();
    } else {
      setError(result.message);
      feedback.error(result.message);
    }
  }

  const operationField = (
    <label className="block text-xs text-ocean/60">
      Номер операции Kaspi (необязательно)
      <input
        value={operationId}
        onChange={(e) => setOperationId(e.target.value)}
        maxLength={100}
        placeholder="например: 1234567890"
        className={`${INPUT} mt-1`}
      />
    </label>
  );
  const noteField = (label: string) => (
    <label className="block text-xs text-ocean/60">
      {label}
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={`${INPUT} mt-1`} />
    </label>
  );

  const waiting = order.status === "pending" || order.status === "payment_reported";

  return (
    <div className="space-y-3">
      {waiting && mode === null && (
        <>
          {operationField}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={PRIMARY}
              onClick={() =>
                act(
                  {
                    title: "Подтвердить оплату?",
                    confirmLabel: "Деньги пришли, подтвердить",
                    extra: "Подтверждайте, только если нашли это поступление в Kaspi Pay: сумма и время совпадают. После подтверждения покупатель получит билеты.",
                  },
                  () => confirmOrderPayment(order.id, operationId)
                )
              }
            >
              {busy ? "…" : "Подтвердить оплату"}
            </button>
            <button type="button" disabled={busy} className={DANGER} onClick={() => setMode("reject")}>
              Отклонить
            </button>
          </div>
        </>
      )}

      {(order.status === "expired" || order.status === "rejected") && mode === null && (
        <button type="button" disabled={busy} className={SECONDARY} onClick={() => setMode("late")}>
          Деньги пришли позже — «Поздняя оплата»
        </button>
      )}

      {order.status === "late_payment" && mode === null && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className={PRIMARY}
            onClick={() =>
              act(
                {
                  title: "Выдать билеты по поздней оплате?",
                  confirmLabel: "Выдать билеты",
                  extra: "Билеты выдаются, только если все места этого заказа ещё свободны. Если хоть одно уже продано, оформите возврат.",
                },
                () => issueLateOrder(order.id)
              )
            }
          >
            {busy ? "…" : "Выдать билеты"}
          </button>
          <button type="button" disabled={busy} className={DANGER} onClick={() => setMode("refund")}>
            Отметить возврат
          </button>
        </div>
      )}

      {order.status === "confirmed" && mode === null && (
        <button type="button" disabled={busy} className={`${DANGER} !px-3 !py-1.5`} onClick={() => setMode("refund")}>
          Отметить возврат
        </button>
      )}

      {mode === "reject" && (
        <div className="space-y-2">
          {noteField("Причина (необязательно), например: поступление не найдено")}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={DANGER}
              onClick={() =>
                act(
                  { title: "Отклонить заказ?", confirmLabel: "Отклонить", danger: true, extra: "Места освободятся, билеты не будут выданы." },
                  () => rejectOrder(order.id, note)
                )
              }
            >
              {busy ? "…" : "Отклонить заказ"}
            </button>
            <button type="button" className={SECONDARY} onClick={() => setMode(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {mode === "late" && (
        <div className="space-y-2">
          {operationField}
          {noteField("Комментарий (необязательно)")}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={PRIMARY}
              onClick={() =>
                act(
                  {
                    title: "Отметить позднюю оплату?",
                    confirmLabel: "Отметить",
                    extra: "Билеты пока не выдаются. Дальше выберите: «Выдать билеты» (если места свободны) или «Отметить возврат».",
                  },
                  () => markOrderLate(order.id, operationId, note)
                )
              }
            >
              {busy ? "…" : "Отметить позднюю оплату"}
            </button>
            <button type="button" className={SECONDARY} onClick={() => setMode(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {mode === "refund" && (
        <div className="space-y-2">
          {noteField("Комментарий (необязательно), например: возврат через Kaspi 22.10")}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={DANGER}
              onClick={() =>
                act(
                  {
                    title: "Отметить возврат?",
                    confirmLabel: "Деньги вернули, отметить",
                    danger: true,
                    extra: "Сайт сам деньги не возвращает: верните их в Kaspi Pay, затем отметьте здесь. Билеты перестанут действовать, места освободятся.",
                  },
                  () => markOrderRefunded(order.id, note)
                )
              }
            >
              {busy ? "…" : "Отметить возврат"}
            </button>
            <button type="button" className={SECONDARY} onClick={() => setMode(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
