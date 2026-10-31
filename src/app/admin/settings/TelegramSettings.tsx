"use client";

import { useState, useTransition } from "react";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { checkTelegramLink, disconnectTelegram, sendTelegramTest, type TelegramResult } from "./telegramActions";

const BUTTON = "px-4 py-2 rounded-full border border-cream-dark text-sm font-semibold text-ocean hover:bg-cream/60 disabled:opacity-50";

/**
 * Order notifications to one cashier's Telegram. The link opens the bot with this institution's
 * code; once the cashier has pressed Start there, «Проверить» connects them. The link can be sent
 * to the cashier: whoever presses Start with it receives the notifications.
 */
export default function TelegramSettings({
  link,
  linked,
  configured,
  canManage,
}: {
  /** t.me link with the institution's code; null when the bot is not set up on the server. */
  link: string | null;
  /** A cashier is connected. */
  linked: boolean;
  configured: boolean;
  /** Only the institution's administrator may connect or disconnect. */
  canManage: boolean;
}) {
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function run(action: () => Promise<TelegramResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) feedback.success(result.message);
      else feedback.error(result.message);
    });
  }

  if (!configured) {
    return (
      <p className="text-sm text-ocean/60">
        Бот ещё не настроен на сервере: нужна переменная <code>TELEGRAM_BOT_TOKEN</code> с токеном бота от @BotFather.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        {linked ? (
          <span className="inline-flex items-center gap-2 font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-600" aria-hidden /> Кассир подключён
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 font-semibold text-ocean/60">
            <span className="w-2 h-2 rounded-full bg-ocean/30" aria-hidden /> Не подключено
          </span>
        )}
      </p>

      {canManage && link && (
        <ol className="text-sm text-ocean/70 space-y-2 list-decimal pl-5">
          <li>
            Откройте ссылку на телефоне кассира (или отправьте её кассиру):{" "}
            <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-ocean underline break-all">
              {link.replace("https://", "")}
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(link).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="ml-2 text-xs font-semibold text-ocean/60 hover:text-ocean"
            >
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </li>
          <li>В Telegram нажмите <b>Start</b> (Запустить).</li>
          <li>Вернитесь сюда и нажмите «Проверить подключение».</li>
        </ol>
      )}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run(checkTelegramLink)} disabled={pending} className="btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-50">
            {pending ? "Проверка…" : linked ? "Подключить другого кассира" : "Проверить подключение"}
          </button>
          {linked && (
            <>
              <button type="button" onClick={() => run(sendTelegramTest)} disabled={pending} className={BUTTON}>
                Отправить тест
              </button>
              <button type="button" onClick={() => run(disconnectTelegram)} disabled={pending} className={`${BUTTON} text-red-600`}>
                Отключить
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-ocean/50">Подключать и отключать уведомления может администратор учреждения.</p>
      )}

      <p className="text-xs text-ocean/40">
        Приходят: новый заказ, «Я оплатил», подтверждение, отклонение, поздняя оплата, выдача билетов, возврат. В сообщениях
        номер заказа, мероприятие, число билетов и сумма — без имени и телефона покупателя (их видно в «Заказах»).
      </p>
    </div>
  );
}
