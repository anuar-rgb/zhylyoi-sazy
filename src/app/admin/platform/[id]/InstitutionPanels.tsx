"use client";

import { useActionState, useState, useTransition } from "react";
import type { InstitutionAdmin } from "@/lib/platform";
import type { MailStatus } from "@/lib/mailSettings";
import {
  addAdminAction,
  mailLinkAction,
  newLinkAction,
  removeAdminAction,
  removeMailAction,
  saveMailAction,
  testMailAction,
  updateSiteAction,
  type PlatformState,
} from "../actions";
import { CARD, INITIAL, INPUT, LABEL, LinkBox, Notice } from "../ui";

/** The site: its domain and whether it is on. Switched off, the domain answers «Сайт не найден». */
export function SitePanel({ id, domain, isActive }: { id: string; domain: string | null; isActive: boolean }) {
  const [state, action, pending] = useActionState(updateSiteAction, INITIAL);
  return (
    <form action={action} className={CARD}>
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-semibold text-ocean mb-4">Сайт</p>
      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className={LABEL} htmlFor="domain">Домен</label>
          <input id="domain" name="domain" defaultValue={domain ?? ""} required className={INPUT} placeholder="dk-kulsary.kz" />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ocean/80 cursor-pointer pb-2.5">
          <input type="checkbox" name="is_active" defaultChecked={isActive} className="w-4 h-4 accent-ocean" />
          Сайт включён
        </label>
      </div>
      <p className="text-xs text-ocean/40 mt-3">
        Выключенный сайт отвечает «Сайт не найден», а его администраторы не могут войти в панель на этом адресе. Данные
        не удаляются. Домен меняйте вместе с записью A у регистратора, иначе сайт пропадёт.
      </p>
      <Notice state={state} />
      <button type="submit" disabled={pending} className="mt-4 btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

/** One admin's link, once made: copy it, or send it from the institution's mailbox. */
function LinkActions({ id, state }: { id: string; state: PlatformState }) {
  const [mailState, mailAction, mailing] = useActionState(mailLinkAction, INITIAL);
  if (!state.link || !state.linkFor) return null;
  return (
    <>
      <LinkBox link={state.link} />
      <form action={mailAction} className="mt-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="link" value={state.link} />
        <input type="hidden" name="email" value={state.linkFor.email} />
        <input type="hidden" name="name" value={state.linkFor.name} />
        <button
          type="submit"
          disabled={mailing}
          className="px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50 disabled:opacity-50"
        >
          {mailing ? "Отправка…" : `Отправить письмом на ${state.linkFor.email}`}
        </button>
        <Notice state={mailState} />
      </form>
    </>
  );
}

function AdminRow({ id, person }: { id: string; person: InstitutionAdmin }) {
  const [linkState, linkAction, linking] = useActionState(newLinkAction, INITIAL);
  const [removeState, setRemoveState] = useState<PlatformState>(INITIAL);
  const [removing, startRemove] = useTransition();
  return (
    <li className="py-3 border-t border-cream-dark first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ocean break-all">{person.email}</p>
          <p className="text-xs text-ocean/50">
            {person.name || "без имени"} · {person.signedIn ? "уже входил" : "ещё не входил"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={linkAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="user_id" value={person.userId} />
            <input type="hidden" name="email" value={person.email} />
            <input type="hidden" name="name" value={person.name} />
            <button
              type="submit"
              disabled={linking}
              className="px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50 disabled:opacity-50"
            >
              {linking ? "…" : "Новая ссылка для пароля"}
            </button>
          </form>
          <button
            type="button"
            disabled={removing}
            onClick={() => {
              if (!window.confirm(`Убрать доступ ${person.email} к панели учреждения?`)) return;
              startRemove(async () => setRemoveState(await removeAdminAction(id, person.userId)));
            }}
            className="px-4 py-2 rounded-full text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Убрать доступ
          </button>
        </div>
      </div>
      <Notice state={linkState} />
      <LinkActions id={id} state={linkState} />
      <Notice state={removeState} />
    </li>
  );
}

/** The institution's admins: who runs its panel. The first one is added right after creating it. */
export function AdminsPanel({ id, admins, domain }: { id: string; admins: InstitutionAdmin[]; domain: string | null }) {
  const [state, action, pending] = useActionState(addAdminAction, INITIAL);
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Администраторы учреждения</p>
      <p className="text-xs text-ocean/50 mb-3">
        Они ведут сайт учреждения в его панели{domain ? ` (${domain}/admin)` : ""}: мероприятия, билеты, тексты, настройки.
        Пароль каждый задаёт сам по ссылке; вы его не видите.
      </p>
      {admins.length > 0 ? (
        <ul>
          {admins.map((person) => (
            <AdminRow key={person.userId} id={id} person={person} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ocean/60">Администраторов пока нет.</p>
      )}

      <form action={action} className="mt-4 pt-4 border-t border-cream-dark grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <input type="hidden" name="id" value={id} />
        <div>
          <label className={LABEL} htmlFor="admin_email">Почта</label>
          <input id="admin_email" name="email" type="email" required className={INPUT} autoComplete="off" />
        </div>
        <div>
          <label className={LABEL} htmlFor="admin_name">Имя (необязательно)</label>
          <input id="admin_name" name="name" className={INPUT} />
        </div>
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          {pending ? "…" : "Добавить"}
        </button>
      </form>
      <Notice state={state} />
      <LinkActions id={id} state={state} />
    </div>
  );
}

/** The institution's own mailbox for tickets and notices. The password is write-only. */
export function MailPanel({ id, status, adminEmail }: { id: string; status: MailStatus; adminEmail: string }) {
  const [saveState, saveAction, saving] = useActionState(saveMailAction, INITIAL);
  const [testState, testAction, testing] = useActionState(testMailAction, INITIAL);
  const [removeState, setRemoveState] = useState<PlatformState>(INITIAL);
  const [removing, startRemove] = useTransition();

  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Почта для писем</p>
      <p className="text-xs text-ocean/50 mb-4">
        С этого ящика покупателям уходят билеты, письма об отмене и переносе, контролёрам — приглашения. Обычно ящик на
        домене учреждения у его хостинга. Сейчас:{" "}
        <span className="font-semibold">{status.configured ? `настроена (${status.fromAddress ?? status.user})` : "не настроена — письма не уходят"}</span>.
      </p>

      <form action={saveAction} className="grid sm:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={id} />
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
          <input id="smtp_user" name="smtp_user" defaultValue={status.user ?? ""} placeholder="bilet@dk-example.kz" className={INPUT} required autoComplete="off" />
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
                startRemove(async () => setRemoveState(await removeMailAction(id)));
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
          <input type="hidden" name="id" value={id} />
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
