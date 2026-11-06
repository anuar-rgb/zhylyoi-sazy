"use client";

import { useActionState, useState } from "react";
import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { saveBankConnection, type BankFormState } from "./bankActions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-base sm:text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * The institution's own values from the bank's contract. Saving them switches nothing on by
 * itself; that is the separate choice below. The secret is never shown back.
 */
export default function BankConnectionForm({
  methodId,
  providerName,
  ready,
  notReadyReason,
  hasSecret,
  terminalId,
  clientId,
}: {
  methodId: string;
  providerName: string;
  /** The server can store the values safely. */
  ready: boolean;
  notReadyReason: string | null;
  hasSecret: boolean;
  terminalId: string | null;
  clientId: string | null;
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(saveBankConnection, { error: null });
  useActionToast(state, "Данные банка сохранены");
  const [removing, setRemoving] = useState(false);

  // The tick belongs to the stored keys: once they are gone (or saved anew) it must start unticked,
  // or the button keeps saying "Удалить данные" with nothing left to delete.
  const [hadSecret, setHadSecret] = useState(hasSecret);
  if (hadSecret !== hasSecret) {
    setHadSecret(hasSecret);
    setRemoving(false);
  }

  return (
    <form action={formAction} className={`${CARD} mt-5 space-y-5`}>
      <input type="hidden" name="method_id" value={methodId} />

      <div>
        <p className="text-sm font-semibold text-ocean">Подключение к банку ({providerName})</p>
        <p className="text-xs text-ocean/50 mt-1">Эти три значения банк выдаёт по договору, у каждого ДК свои.</p>
      </div>

      {notReadyReason && <p className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3">{notReadyReason}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="terminal_id">
            TerminalID
          </label>
          <input id="terminal_id" name="terminal_id" defaultValue={terminalId ?? ""} autoComplete="off" disabled={!ready} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="client_id">
            ClientID
          </label>
          <input id="client_id" name="client_id" defaultValue={clientId ?? ""} autoComplete="off" disabled={!ready} className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="client_secret">
            ClientSecret
          </label>
          <input
            id="client_secret"
            name="client_secret"
            type="password"
            autoComplete="new-password"
            disabled={!ready}
            placeholder={hasSecret ? "Сохранён. Введите новый, чтобы заменить" : ""}
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">{hasSecret ? "Секрет сохранён в зашифрованном виде и больше не показывается." : "Секрет не сохранён."}</p>
        </div>
      </div>

      {hasSecret && (
        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
          <input type="checkbox" name="remove" checked={removing} onChange={(e) => setRemoving(e.target.checked)} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
          <span>Удалить сохранённые данные банка</span>
        </label>
      )}

      <button type="submit" disabled={pending || !ready} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
        {pending ? "Сохранение…" : hasSecret && removing ? "Удалить данные" : "Сохранить данные банка"}
      </button>
    </form>
  );
}
