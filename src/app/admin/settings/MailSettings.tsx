"use client";

import { useActionState, useState, useTransition } from "react";
import type { MailStatus } from "@/lib/mailSettings";
import { removeMail, saveMail, testMail, type MailFormState } from "./mailActions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
const INITIAL: MailFormState = { ok: false, message: null };

function Notice({ state }: { state: MailFormState }) {
  if (!state.message) return null;
  return (
    <p
      className={`text-sm rounded-2xl px-4 py-3 mt-3 ${
        state.ok ? "bg-gold/15 border border-gold/40 text-ocean-dark" : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

/**
 * «Почта для писем»: the institution's own mailbox that tickets and notices go out from. Its own
 * form, apart from the card's: only the platform admin fills it in (the server checks), and the
 * password is write-only — the page never receives it back.
 */
export function MailSettingsEditor({ status, adminEmail }: { status: MailStatus; adminEmail: string }) {
  const [saveState, saveAction, saving] = useActionState(saveMail, INITIAL);
  const [testState, testAction, testing] = useActionState(testMail, INITIAL);
  const [removeState, setRemoveState] = useState<MailFormState>(INITIAL);
  const [removing, startRemove] = useTransition();

  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Почта для писем</p>
      <p className="text-xs text-ocean/50 mb-4">
        С этого ящика покупателям уходят билеты, письма об отмене и переносе, контролёрам — приглашения. Видно и
        меняется только администратором платформы. Сейчас:{" "}
        <span className="font-semibold">{status.configured ? `настроена (${status.fromAddress ?? status.user})` : "не настроена — письма не уходят"}</span>.
      </p>

      <form action={saveAction} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="smtp_host">Сервер исходящей почты (SMTP)</label>
          <input id="smtp_host" name="smtp_host" defaultValue={status.host ?? ""} placeholder="mail.ps.kz" className={INPUT} required />
        </div>
        <div>
          <label className={LABEL} htmlFor="smtp_port">Порт</label>
          <input id="smtp_port" name="smtp_port" inputMode="numeric" defaultValue={status.port ?? 465} className={INPUT} required />
        </div>
        <div>
          <label className={LABEL} htmlFor="smtp_user">Логин (обычно сам адрес)</label>
          <input id="smtp_user" name="smtp_user" defaultValue={status.user ?? ""} placeholder="info@dk-example.kz" className={INPUT} required autoComplete="off" />
        </div>
        <div>
          <label className={LABEL} htmlFor="smtp_password">Пароль</label>
          <input
            id="smtp_password"
            name="smtp_password"
            type="password"
            autoComplete="new-password"
            placeholder={status.configured ? "сохранён — пусто, чтобы не менять" : ""}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="from_address">Адрес отправителя (необязательно)</label>
          <input id="from_address" name="from_address" type="email" defaultValue={status.fromAddress ?? ""} placeholder="если не логин" className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="reply_to">Куда приходят ответы (необязательно)</label>
          <input id="reply_to" name="reply_to" type="email" defaultValue={status.replyTo ?? ""} placeholder="если не адрес отправителя" className={INPUT} />
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? "Сохранение…" : "Сохранить почту"}
          </button>
          {status.configured && (
            <button
              type="button"
              disabled={removing}
              onClick={() => {
                if (!window.confirm("Отключить почту? Письма покупателям перестанут уходить.")) return;
                startRemove(async () => setRemoveState(await removeMail()));
              }}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Отключить почту
            </button>
          )}
        </div>
      </form>
      <Notice state={saveState} />
      <Notice state={removeState} />

      {status.configured && (
        <form action={testAction} className="mt-5 pt-5 border-t border-cream-dark flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className={LABEL} htmlFor="test_to">Отправить проверочное письмо на</label>
            <input id="test_to" name="test_to" type="email" defaultValue={adminEmail} className={INPUT} required />
          </div>
          <button
            type="submit"
            disabled={testing}
            className="px-5 py-2.5 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50 disabled:opacity-50"
          >
            {testing ? "Отправка…" : "Отправить"}
          </button>
        </form>
      )}
      <Notice state={testState} />
    </div>
  );
}

/** What the institution's own staff see: whether letters go out, and from where. */
export function MailSettingsStatus({ status }: { status: MailStatus }) {
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Почта для писем</p>
      <p className="text-sm text-ocean/70">
        {status.configured
          ? `Настроена. Билеты и уведомления покупателям уходят с адреса ${status.fromAddress ?? status.user}.`
          : "Не настроена: билеты и уведомления покупателям на почту не уходят. Обратитесь в поддержку платформы."}
      </p>
    </div>
  );
}
