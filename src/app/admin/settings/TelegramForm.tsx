"use client";

import { useActionState } from "react";
import type { TelegramSettings } from "@/lib/orgTelegram";
import type { TelegramState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

const TEST_MESSAGE: Record<string, { text: string; tone: "good" | "bad" }> = {
  sent: { text: "Отправлено. Проверьте Telegram — сообщение должно прийти за несколько секунд.", tone: "good" },
  not_configured: { text: "Сначала сохраните токен и идентификатор чата.", tone: "bad" },
  denied: { text: "Недостаточно прав для этого учреждения.", tone: "bad" },
  failed: { text: "Не удалось отправить. Проверьте токен.", tone: "bad" },
};

export default function TelegramForm({
  settings,
  action,
}: {
  settings: TelegramSettings;
  action: (prev: TelegramState, form: FormData) => Promise<TelegramState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null, saved: false, tested: null });

  const test = state.tested ? TEST_MESSAGE[state.tested] : null;

  return (
    <form action={formAction} className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-1">Уведомления в Telegram</p>
      <p className="text-xs text-ocean/40 mb-4">
        Когда кто-то запишется в кружок, бот пришлёт сообщение. У каждого учреждения свой бот — сообщения не
        попадают к другим.
      </p>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3 mb-4">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="bg-gold/15 border border-gold/40 text-ocean-dark text-sm rounded-2xl px-4 py-3 mb-4">
          Сохранено.
        </p>
      )}
      {test && (
        <p
          className={`text-sm rounded-2xl px-4 py-3 mb-4 border ${
            test.tone === "good"
              ? "bg-gold/15 border-gold/40 text-ocean-dark"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {test.text}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="bot_token">
            Токен бота
          </label>
          <input
            id="bot_token"
            name="bot_token"
            type="password"
            /* The stored token is never sent to the browser, so the field starts empty
               whether or not one exists. autoComplete off keeps the browser from
               offering to remember a secret that is not the user's own password. */
            autoComplete="off"
            placeholder={settings.hasToken ? "сохранён — заполните, чтобы заменить" : "123456789:AA..."}
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">
            {settings.hasToken
              ? "Токен сохранён и не показывается. Оставьте поле пустым — останется прежний."
              : "Получите у @BotFather: напишите ему /newbot и следуйте подсказкам."}
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor="chat_id">
            Идентификатор чата
          </label>
          <input
            id="chat_id"
            name="chat_id"
            defaultValue={settings.chatId}
            placeholder="705995985 или -1001234567890"
            className={INPUT}
          />
          <p className="text-xs text-ocean/40 mt-1.5">
            Куда слать. Свой узнаете у @userinfobot; у группы номер начинается с минуса.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-4">
        <input
          type="checkbox"
          name="is_enabled"
          defaultChecked={settings.isEnabled}
          className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
        />
        <span>
          Присылать уведомления
          <span className="block text-xs text-ocean/40">
            Снимите галочку, чтобы временно прекратить, не стирая настройки.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>

        {/* Same form, different intent: the value travels with the submission, so the
            server decides what was asked rather than the button doing its own request. */}
        <button
          type="submit"
          name="intent"
          value="test"
          disabled={pending || !settings.hasToken}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-ocean/70 border border-cream-dark hover:bg-cream/50 disabled:opacity-40"
        >
          Проверить
        </button>

        {settings.hasToken && (
          <button
            type="submit"
            name="intent"
            value="clear"
            disabled={pending}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Убрать токен
          </button>
        )}
      </div>

      <p className="text-xs text-ocean/40 mt-4">
        «Проверить» сохранённый токен не меняет: сначала сохраните, потом проверяйте.
      </p>
    </form>
  );
}
