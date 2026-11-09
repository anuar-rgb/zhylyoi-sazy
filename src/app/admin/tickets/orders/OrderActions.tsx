"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import type { BookingStatus } from "@/lib/bookingStatus";
import { markOrderRefunded, refundOrderItemsOnline, refundOrderOnline, type OrderActionResult } from "./actions";

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

export type RefundableSeat = { id: string; name: string; price: number; checkedIn: boolean };

/**
 * What the cashier can do with one order. Money is taken and returned only by the bank: a paid
 * order can go back whole or seat by seat, and changes only once the bank agreed. A free order has
 * no money to return, so its tickets are cancelled. Every action asks first, showing what it is
 * about to do; on an error the order stays exactly as it was.
 */
export default function OrderActions({
  order,
  paidOnline,
  needsRefund,
  free,
  seats,
}: {
  order: OrderSummary;
  /** The money came through the bank, so it goes back through the bank. */
  paidOnline?: boolean;
  /** The bank took the money but the order could not honour it, and the automatic refund failed. */
  needsRefund?: boolean;
  /** Nothing was paid: tickets are cancelled, not refunded. */
  free?: boolean;
  /** The seats still held, to choose from for a partial refund. */
  seats: RefundableSeat[];
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const summary =
    `Заказ ${order.orderNumber}\n${order.eventTitle || "Мероприятие"}\n` +
    `Билетов: ${order.tickets} · Сумма: ${order.amountText}\n${order.buyerName} · ${order.buyerPhone}`;

  async function act(
    ask: { title: string; confirmLabel: string; extra: string },
    action: () => Promise<OrderActionResult>
  ) {
    const confirmed = await feedback.confirm({ title: ask.title, message: `${summary}\n\n${ask.extra}`, confirmLabel: ask.confirmLabel, danger: true });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      feedback.success(result.message);
      setChoosing(false);
      setChosen(new Set());
      router.refresh();
    } else {
      setError(result.message);
      feedback.error(result.message);
    }
  }

  const refundAll = () =>
    act(
      {
        title: "Вернуть деньги за весь заказ?",
        confirmLabel: "Вернуть деньги",
        extra: "Деньги вернутся на карту покупателя через банк. Все билеты заказа перестанут действовать, места снова поступят в продажу.",
      },
      () => refundOrderOnline(order.id)
    );

  if (needsRefund) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-700">Оплата пришла, но выдать места нельзя, а автоматический возврат не прошёл.</p>
        <button type="button" disabled={busy} className={DANGER} onClick={refundAll}>
          {busy ? "…" : "Вернуть деньги"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (free && order.status === "confirmed") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          disabled={busy}
          className={DANGER}
          onClick={() =>
            act(
              { title: "Аннулировать билеты?", confirmLabel: "Аннулировать", extra: "Заказ бесплатный, деньги возвращать не нужно. Билеты перестанут действовать, места снова поступят в продажу." },
              () => markOrderRefunded(order.id)
            )
          }
        >
          {busy ? "…" : "Аннулировать билеты"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (!paidOnline || order.status !== "confirmed") {
    const waiting = order.status === "pending" || order.status === "payment_reported";
    return <p className="text-xs text-ocean/50">{waiting ? "Покупатель оплачивает картой. Подтверждать ничего не нужно." : "Оплата картой не поступила."}</p>;
  }

  const picked = seats.filter((seat) => chosen.has(seat.id));
  const pickedSum = picked.reduce((sum, seat) => sum + seat.price, 0);
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {!choosing ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={DANGER} onClick={refundAll}>
            {busy ? "…" : "Вернуть весь заказ"}
          </button>
          {seats.length > 1 && (
            <button type="button" disabled={busy} className={SECONDARY} onClick={() => setChoosing(true)}>
              Вернуть часть мест
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ocean/60">Отметьте места, за которые вернуть деньги. Остальные билеты заказа продолжат действовать.</p>
          <ul className="space-y-1.5">
            {seats.map((seat) => (
              <li key={seat.id}>
                <label
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                    seat.checkedIn ? "border-cream-dark text-ocean/40" : "border-cream-dark text-ocean cursor-pointer hover:bg-cream/40"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-ocean shrink-0"
                      checked={chosen.has(seat.id)}
                      disabled={busy || seat.checkedIn}
                      onChange={() => toggle(seat.id)}
                    />
                    <span className="truncate">{seat.name}</span>
                    {seat.checkedIn && <span className="text-xs shrink-0">· уже прошёл</span>}
                  </span>
                  <span className="font-semibold shrink-0">{seat.price.toLocaleString("ru-RU")} ₸</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || picked.length === 0}
              className={DANGER}
              onClick={() =>
                act(
                  {
                    title: "Вернуть деньги за выбранные места?",
                    confirmLabel: "Вернуть деньги",
                    extra:
                      `Места: ${picked.map((seat) => seat.name).join("; ")}\nК возврату: ${pickedSum.toLocaleString("ru-RU")} ₸\n\n` +
                      "Деньги вернутся на карту покупателя через банк. Эти билеты перестанут действовать, места снова поступят в продажу. Остальные билеты заказа действуют.",
                  },
                  () => refundOrderItemsOnline(order.id, picked.map((seat) => seat.id))
                )
              }
            >
              {busy ? "…" : picked.length > 0 ? `Вернуть выбранные · ${pickedSum.toLocaleString("ru-RU")} ₸` : "Вернуть выбранные"}
            </button>
            <button
              type="button"
              disabled={busy}
              className={SECONDARY}
              onClick={() => {
                setChoosing(false);
                setChosen(new Set());
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
