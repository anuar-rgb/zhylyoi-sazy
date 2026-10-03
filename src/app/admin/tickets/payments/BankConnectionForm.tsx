"use client";

import { useActionState, useState } from "react";
import { useActionToast, useFeedback } from "@/components/feedback/FeedbackProvider";
import { saveBankConnection, type BankFormState } from "./bankActions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * The institution's own keys from the bank, and the address the bank should notify.
 *
 * Saving keys here does not switch anything on by itself: payments are confirmed automatically
 * only once an integration for this bank exists (src/lib/payments/registry.ts). Until then they
 * wait, and payments are confirmed by hand as before.
 */
export default function BankConnectionForm({
  methodId,
  providerName,
  integrationReady,
  serverReady,
  hasSecret,
  merchantId,
}: {
  methodId: string;
  providerName: string;
  /** An adapter for this bank exists in the code. */
  integrationReady: boolean;
  /** The server holds the service-role key, so keys can be stored. */
  serverReady: boolean;
  hasSecret: boolean;
  merchantId: string | null;
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(saveBankConnection, { error: null });
  useActionToast(state, "Данные банка сохранены");
  const feedback = useFeedback();
  const [removing, setRemoving] = useState(false);

  // The tick belongs to the stored keys: once they are gone (or saved anew) it must start unticked,
  // or the button keeps saying "Удалить данные" with nothing left to delete.
  const [hadSecret, setHadSecret] = useState(hasSecret);
  if (hadSecret !== hasSecret) {
    setHadSecret(hasSecret);
    setRemoving(false);
  }

  const webhookUrl = () => `${window.location.origin}/api/payments/webhook/${methodId}`;
  const [shownUrl, setShownUrl] = useState<string | null>(null);

  async function copyUrl() {
    const url = webhookUrl();
    setShownUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      feedback.success("Адрес скопирован");
    } catch {
      feedback.error("Не удалось скопировать. Выделите адрес вручную.");
    }
  }

  return (
    <form action={formAction} className={`${CARD} mt-5 space-y-5`}>
      <input type="hidden" name="method_id" value={methodId} />

      <div>
        <p className="text-sm font-semibold text-ocean">Подключение к банку ({providerName})</p>
        <p className="text-xs text-ocean/50 mt-1">
          Для автоматической проверки оплат. Данные выдаёт банк по договору учреждения.
        </p>
      </div>

      {!integrationReady && (
        <p className="bg-cream/50 border border-cream-dark text-ocean/70 text-xs rounded-2xl px-4 py-3">
          Автоматическое подтверждение для этого банка ещё не подключено. Данные можно сохранить заранее, оплата пока
          подтверждается вручную.
        </p>
      )}
      {!serverReady && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3">
          На сервере не задан служебный ключ (SUPABASE_SERVICE_ROLE_KEY), поэтому данные банка пока сохранить нельзя.
        </p>
      )}

      <div>
        <p className={LABEL}>Адрес для уведомлений банка</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="px-4 py-2 rounded-full border border-cream-dark text-xs font-semibold text-ocean hover:bg-cream transition-colors"
          >
            Скопировать адрес
          </button>
          {shownUrl && <code className="text-xs text-ocean/70 break-all">{shownUrl}</code>}
        </div>
        <p className="text-xs text-ocean/40 mt-1.5">Этот адрес нужно указать банку, когда он спросит, куда присылать сообщения об оплате.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="merchant_id">
            Идентификатор магазина (Merchant ID)
          </label>
          <input
            id="merchant_id"
            name="merchant_id"
            defaultValue={merchantId ?? ""}
            autoComplete="off"
            disabled={!serverReady}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="secret_key">
            Секретный ключ
          </label>
          <input
            id="secret_key"
            name="secret_key"
            type="password"
            autoComplete="new-password"
            disabled={!serverReady}
            placeholder={hasSecret ? "Сохранён. Введите новый, чтобы заменить" : ""}
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">
            {hasSecret ? "Ключ сохранён и больше не показывается." : "Ключ не сохранён."}
          </p>
        </div>
      </div>

      {hasSecret && (
        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
          <input
            type="checkbox"
            name="remove"
            checked={removing}
            onChange={(e) => setRemoving(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
          />
          <span>Удалить сохранённые данные банка</span>
        </label>
      )}

      <button
        type="submit"
        disabled={pending || !serverReady}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Сохранение…" : hasSecret && removing ? "Удалить данные" : "Сохранить данные банка"}
      </button>
    </form>
  );
}
