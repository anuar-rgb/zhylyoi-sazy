"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { setPaymentMode, type BankFormState } from "./bankActions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/** How payments with this method are confirmed: by staff, or by the bank itself. */
export default function PaymentModeForm({ methodId, mode, canUseBank }: { methodId: string; mode: string; canUseBank: boolean }) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(setPaymentMode, { error: null });
  useActionToast(state, "Режим оплаты сохранён");

  return (
    <form action={formAction} className={`${CARD} mt-5 space-y-4`}>
      <input type="hidden" name="method_id" value={methodId} />
      <p className="text-sm font-semibold text-ocean">Как подтверждается оплата</p>

      <label className="flex items-start gap-2.5 text-sm text-ocean/80 cursor-pointer">
        <input type="radio" name="mode" value="manual" defaultChecked={mode !== "api"} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
        <span>
          <span className="font-semibold">Вручную.</span> Покупатель платит по ссылке, кассир проверяет поступление и подтверждает заказ.
        </span>
      </label>

      <label className={`flex items-start gap-2.5 text-sm ${canUseBank ? "text-ocean/80 cursor-pointer" : "text-ocean/40"}`}>
        <input type="radio" name="mode" value="api" defaultChecked={mode === "api"} disabled={!canUseBank} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
        <span>
          <span className="font-semibold">Автоматически через банк.</span> Покупатель вводит данные карты на странице банка и сразу получает билет, кассиру
          ничего нажимать не нужно.
          {!canUseBank && <span className="block text-xs mt-1">Сначала сохраните данные банка выше.</span>}
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {pending ? "Сохранение…" : "Сохранить режим"}
      </button>
    </form>
  );
}
