"use client";

import { useActionState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { setPaymentMode, type BankFormState } from "./bankActions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/** How payments with this method are confirmed: by staff, or by the bank itself. */
export default function PaymentModeForm({
  methodId,
  mode,
  canUseBank,
  reason,
}: {
  methodId: string;
  mode: string;
  /** An integration exists for this bank and its keys are saved. */
  canUseBank: boolean;
  /** Why the bank option is unavailable, shown under it. */
  reason: string | null;
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(setPaymentMode, { error: null });
  useActionToast(state, "Режим оплаты сохранён");

  return (
    <form action={formAction} className={`${CARD} mt-5 space-y-4`}>
      <input type="hidden" name="method_id" value={methodId} />
      <p className="text-sm font-semibold text-ocean">Как подтверждается оплата</p>

      <label className="flex items-start gap-2.5 text-sm text-ocean/80 cursor-pointer">
        <input type="radio" name="mode" value="manual" defaultChecked={mode !== "api"} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
        <span>
          <span className="font-semibold">Вручную.</span> Покупатель видит QR или ссылку, сотрудник проверяет перевод и
          подтверждает бронь кнопкой.
        </span>
      </label>

      <label className={`flex items-start gap-2.5 text-sm ${canUseBank ? "text-ocean/80 cursor-pointer" : "text-ocean/40"}`}>
        <input
          type="radio"
          name="mode"
          value="api"
          defaultChecked={mode === "api"}
          disabled={!canUseBank}
          className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
        />
        <span>
          <span className="font-semibold">Автоматически через банк.</span> У покупателя кнопка «Оплатить», оплату
          подтверждает сам банк, сотруднику ничего нажимать не нужно.
          {!canUseBank && reason && <span className="block text-xs mt-1">{reason}</span>}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Сохранение…" : "Сохранить режим"}
      </button>
    </form>
  );
}
