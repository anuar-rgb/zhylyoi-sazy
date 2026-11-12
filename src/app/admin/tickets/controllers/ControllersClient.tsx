"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import type { Controller } from "@/lib/controllers";
import { addControllerAction, resendInviteAction, setControllerActiveAction } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold";
const SECONDARY =
  "px-4 py-2 rounded-full text-xs font-semibold border border-cream-dark text-ocean hover:bg-cream/60 transition-colors disabled:opacity-50";
const DANGER =
  "px-4 py-2 rounded-full text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50";

export default function ControllersClient({ controllers }: { controllers: Controller[] }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError(null);
    const result = await addControllerAction(name, email);
    setBusy(null);
    if (result.ok) {
      feedback.success(result.message);
      setName("");
      setEmail("");
      router.refresh();
    } else {
      setError(result.message);
      feedback.error(result.message);
    }
  }

  async function resend(controller: Controller) {
    setBusy(controller.id);
    const result = await resendInviteAction(controller.id);
    setBusy(null);
    if (result.ok) feedback.success(result.message);
    else feedback.error(result.message);
  }

  async function toggle(controller: Controller) {
    if (controller.active) {
      const confirmed = await feedback.confirm({
        title: `Выключить доступ: ${controller.name}?`,
        message: `${controller.email}\n\nКонтролёр больше не сможет войти и проверять билеты. Включить доступ снова можно здесь же.`,
        confirmLabel: "Выключить",
        danger: true,
      });
      if (!confirmed) return;
    }
    setBusy(controller.id);
    const result = await setControllerActiveAction(controller.id, !controller.active);
    setBusy(null);
    if (result.ok) {
      feedback.success(result.message);
      router.refresh();
    } else feedback.error(result.message);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className={CARD}>
        <h2 className="text-lg font-bold text-ocean mb-1">Добавить контролёра</h2>
        <p className="text-sm text-ocean/60 mb-4">
          На почту придёт письмо со ссылкой: по ней контролёр сам придумает пароль. Ссылка действует сутки.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="block text-sm font-medium text-ocean/70 mb-1">Имя и фамилия</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className={INPUT} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-ocean/70 mb-1">Электронная почта</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT} />
          </label>
        </div>
        <button type="submit" disabled={busy !== null} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {busy === "add" ? "Добавление…" : "Добавить и отправить письмо"}
        </button>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </form>

      <section className={CARD}>
        <h2 className="text-lg font-bold text-ocean mb-3">Контролёры ({controllers.length})</h2>
        {controllers.length === 0 ? (
          <p className="text-sm text-ocean/60">Пока никого нет.</p>
        ) : (
          <ul className="divide-y divide-cream-dark">
            {controllers.map((controller) => (
              <li key={controller.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${controller.active ? "text-ocean" : "text-ocean/40"}`}>{controller.name}</p>
                  <p className="text-xs text-ocean/50 truncate">
                    {controller.email}
                    {" · "}
                    {!controller.active ? "доступ выключен" : controller.signedIn ? "входил" : "ещё не задал пароль"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {controller.active && !controller.signedIn && (
                    <button type="button" className={SECONDARY} disabled={busy !== null} onClick={() => void resend(controller)}>
                      Отправить ссылку ещё раз
                    </button>
                  )}
                  <button
                    type="button"
                    className={controller.active ? DANGER : SECONDARY}
                    disabled={busy !== null}
                    onClick={() => void toggle(controller)}
                  >
                    {busy === controller.id ? "…" : controller.active ? "Выключить доступ" : "Включить доступ"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
