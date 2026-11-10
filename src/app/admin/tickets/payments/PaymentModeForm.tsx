"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { setPaymentMode, type BankFormState } from "./bankActions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/** Whether buyers can pay by card with this method; the bank confirms each payment itself. */
export default function PaymentModeForm({
  methodId,
  mode,
  canUseBank,
  switchedOn = true,
}: {
  methodId: string;
  mode: string;
  canUseBank: boolean;
  /** The platform has switched this bank on for buyers; until then the details can only be saved. */
  switchedOn?: boolean;
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(setPaymentMode, { error: null });
  useActionToast(state, "Сохранено");

  return (
    <form action={formAction} className={`${CARD} mt-5 space-y-4`}>
      <input type="hidden" name="method_id" value={methodId} />
      <p className="text-sm font-semibold text-ocean">Приём оплаты картой</p>

      <label className="flex items-start gap-2.5 text-sm text-ocean/80 cursor-pointer">
        <input type="radio" name="mode" value="manual" defaultChecked={mode !== "api"} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
        <span>
          <span className="font-semibold">Выключен.</span> Платные билеты купить нельзя, бесплатные выдаются как обычно.
        </span>
      </label>

      <label className={`flex items-start gap-2.5 text-sm ${canUseBank ? "text-ocean/80 cursor-pointer" : "text-ocean/40"}`}>
        <input type="radio" name="mode" value="api" defaultChecked={mode === "api"} disabled={!canUseBank} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
        <span>
          <span className="font-semibold">Включён.</span> Покупатель вводит данные карты на странице банка и сразу получает билет, кассиру
          ничего нажимать не нужно.
          {!switchedOn ? (
            <span className="block text-xs mt-1">
              Пока недоступно: администратор платформы включит этот банк после его проверки. Данные банка выше можно сохранить уже сейчас.
            </span>
          ) : (
            !canUseBank && <span className="block text-xs mt-1">Сначала сохраните данные банка выше.</span>
          )}
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
