"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState } from "react";
import Link from "next/link";
import type { PaymentMethodRecord, PaymentProviderRecord } from "@/lib/paymentMethods";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default function PaymentMethodForm({
  method,
  providers,
  action,
  heading,
}: {
  /** Editing an existing method. Absent on the "add" form. */
  method?: PaymentMethodRecord;
  /** On the "add" form: providers not yet used by this organization. On edit: just the current one, locked. */
  providers: PaymentProviderRecord[];
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  useActionToast(state, "Сохранено");

  return (
    <form action={formAction} className="space-y-5">
      {method && <input type="hidden" name="id" value={method.id} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/tickets/payments" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <div className="mb-5">
          <label className={LABEL} htmlFor="provider_code">
            Провайдер
          </label>
          {method ? (
            <p className="text-sm font-semibold text-ocean">{method.providerName}</p>
          ) : (
            <select id="provider_code" name="provider_code" required className={INPUT} defaultValue="">
              <option value="" disabled>
                Выберите провайдера
              </option>
              {providers.map((provider) => (
                <option key={provider.code} value={provider.code}>
                  {provider.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <BilingualField
          kkName="display_name_kk"
          ruName="display_name_ru"
          label="Название для зрителя"
          defaultKk={method?.displayNameKk}
          defaultRu={method?.displayNameRu}
          placeholderKk="Kaspi арқылы төлеу"
          placeholderRu="Оплата через Kaspi"
        />
        <p className="text-xs text-ocean/40 mt-1.5">Необязательно — если не заполнить, покажется название провайдера.</p>

        {!method && (
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-5 pt-5 border-t border-cream-dark">
            <input type="checkbox" name="is_default" className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
            <span>Использовать по умолчанию</span>
          </label>
        )}
      </div>

      <div className={CARD}>
        <label className={LABEL} htmlFor="payment_url">
          Ссылка на оплату
        </label>
        <input
          id="payment_url"
          name="payment_url"
          type="url"
          inputMode="url"
          defaultValue={method?.paymentUrl ?? ""}
          placeholder="https://pay.kaspi.kz/..."
          className={INPUT}
        />
        <p className="text-xs text-ocean/40 mt-1.5">
          Ссылка, которую банк выдал этому учреждению (Kaspi Pay, Halyk и т. п.). На странице заказа покупатель
          нажимает «Перейти к оплате» и попадает в приложение банка. Без ссылки покупателю будет написано, что платить
          пока нельзя. Только адреса, которые начинаются с https://.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/tickets/payments" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
