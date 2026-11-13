"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import DateTimeField from "@/components/admin/DateTimeField";
import { cancelEventAction, moveEventAction } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
const SECONDARY =
  "px-4 py-2 rounded-full text-xs font-semibold border border-cream-dark text-ocean hover:bg-cream/60 transition-colors disabled:opacity-50";
const DANGER =
  "px-4 py-2 rounded-full text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50";

/**
 * «Перенести» and «Отменить мероприятие» for an event that sells tickets, under its form. Both ask
 * first and say what will happen to the buyers. Moving keeps the tickets and emails them again
 * with the new date; cancelling closes the sale, returns the money through the bank and tells
 * every buyer by email.
 */
export default function EventChangeControls({
  eventId,
  title,
  canMove,
  canCancel,
  ticketsSold,
}: {
  eventId: string;
  title: string;
  canMove: boolean;
  canCancel: boolean;
  /** Orders that were confirmed or paid: the people who get a letter. */
  ticketsSold: number;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [open, setOpen] = useState<"move" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMove && !canCancel) return null;

  const buyers = ticketsSold > 0 ? `Покупателей с билетами: ${ticketsSold}.` : "Билетов пока никто не покупал.";

  async function move(form: FormData) {
    const value = String(form.get("new_date") ?? "");
    if (!value) {
      setError("Укажите новую дату и время.");
      return;
    }
    const confirmed = await feedback.confirm({
      title: `Перенести «${title}»?`,
      message:
        `${buyers}\n\nБилеты останутся действительными на новую дату. Каждому покупателю придёт письмо с новой датой и билетами. ` +
        "Кому дата не подходит, может попросить вернуть деньги: кассир вернёт их на странице мероприятия, в разделе «Заказы».",
      confirmLabel: "Перенести",
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await moveEventAction(eventId, value);
    setBusy(false);
    if (result.ok) {
      feedback.success(result.message);
      setOpen(null);
      router.refresh();
    } else {
      setError(result.message);
      feedback.error(result.message);
    }
  }

  async function cancel() {
    const confirmed = await feedback.confirm({
      title: `Отменить «${title}»?`,
      message:
        `${buyers}\n\nПродажа закроется сразу. Деньги за все оплаченные билеты вернутся покупателям на карту через банк, бесплатные билеты аннулируются. ` +
        "Каждому покупателю придёт письмо об отмене. На сайте мероприятие будет помечено как отменённое.\n\nОтменить отмену нельзя.",
      confirmLabel: "Отменить мероприятие",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    const result = await cancelEventAction(eventId, reason);
    setBusy(false);
    if (result.ok) {
      feedback.success(result.message);
      router.push(`/admin/tickets/stats/${eventId}`);
      router.refresh();
    } else {
      setError(result.message);
      feedback.error(result.message);
    }
  }

  return (
    <section className={`${CARD} mt-6`}>
      <h2 className="text-lg font-bold text-ocean mb-1">Перенос и отмена</h2>
      <p className="text-sm text-ocean/60 mb-4">
        Если мероприятие не состоится в назначенный день. Покупатели узнают об этом из письма на свою почту.
      </p>

      {open === null && (
        <div className="flex flex-wrap gap-2">
          {canMove && (
            <button type="button" className={SECONDARY} disabled={busy} onClick={() => setOpen("move")}>
              Перенести
            </button>
          )}
          {canCancel && (
            <button type="button" className={DANGER} disabled={busy} onClick={() => setOpen("cancel")}>
              Отменить мероприятие
            </button>
          )}
        </div>
      )}

      {open === "move" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void move(new FormData(e.currentTarget));
          }}
        >
          <div className="max-w-sm">
            <DateTimeField name="new_date" label="Новая дата и время" required />
          </div>
          <p className="text-xs text-ocean/50">Окончание, если оно указано, сдвинется на столько же.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={SECONDARY} disabled={busy}>
              {busy ? "…" : "Перенести"}
            </button>
            <button type="button" className={SECONDARY} disabled={busy} onClick={() => setOpen(null)}>
              Назад
            </button>
          </div>
        </form>
      )}

      {open === "cancel" && (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-ocean mb-1">Причина (её увидят покупатели в письме)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Например: по техническим причинам"
              className="w-full rounded-2xl border border-cream-dark px-4 py-2.5 text-sm text-ocean focus:outline-none focus:border-ocean/40"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={DANGER} disabled={busy} onClick={() => void cancel()}>
              {busy ? "Отмена мероприятия…" : "Отменить мероприятие"}
            </button>
            <button type="button" className={SECONDARY} disabled={busy} onClick={() => setOpen(null)}>
              Назад
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </section>
  );
}
