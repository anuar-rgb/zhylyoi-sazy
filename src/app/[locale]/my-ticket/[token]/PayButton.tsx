"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useFeedback } from "@/components/feedback/FeedbackProvider";

const TEXTS = {
  ru: {
    pay: "Оплатить",
    preparing: "Подготовка платежа…",
    redirecting: "Перенаправление в банк…",
    hint: "Оплата проходит на странице банка. Мы не видим и не храним данные вашей карты.",
    errors: {
      not_payable: "Эту бронь уже нельзя оплатить: время удержания истекло или она оплачена.",
      method_unavailable: "Этот способ оплаты сейчас недоступен.",
      provider_unavailable: "Банк временно недоступен. Попробуйте ещё раз через минуту.",
      rate_limited: "Слишком много попыток. Подождите минуту.",
      failed: "Не удалось начать оплату. Попробуйте ещё раз.",
    },
  },
  kk: {
    pay: "Төлеу",
    preparing: "Төлем дайындалуда…",
    redirecting: "Банкке бағытталуда…",
    hint: "Төлем банк бетінде жүреді. Біз карта деректерін көрмейміз және сақтамаймыз.",
    errors: {
      not_payable: "Бұл броньды енді төлеуге болмайды: ұстау уақыты аяқталды немесе ол төленген.",
      method_unavailable: "Бұл төлем тәсілі қазір қолжетімсіз.",
      provider_unavailable: "Банк уақытша қолжетімсіз. Бір минуттан кейін қайталап көріңіз.",
      rate_limited: "Әрекет тым көп. Бір минут күтіңіз.",
      failed: "Төлемді бастау мүмкін болмады. Қайталап көріңіз.",
    },
  },
} as const;

type ErrorKey = keyof (typeof TEXTS)["ru"]["errors"];

/**
 * Starts a payment through the institution's bank and sends the buyer to the bank's own page.
 * The browser only asks; the server decides whether the booking may be paid and what to answer.
 * Nothing here can mark anything paid.
 */
export default function PayButton({ accessToken, methodId }: { accessToken: string; methodId: string }) {
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const feedback = useFeedback();
  const [state, setState] = useState<"idle" | "preparing" | "redirecting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setState("preparing");
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, methodId }),
      });
      const data = (await res.json().catch(() => null)) as { redirectUrl?: string; error?: string } | null;

      if (res.ok && data?.redirectUrl) {
        setState("redirecting");
        window.location.assign(data.redirectUrl);
        return;
      }
      const key = (res.status === 429 ? "rate_limited" : (data?.error ?? "failed")) as ErrorKey;
      const message = t.errors[key] ?? t.errors.failed;
      setError(message);
      feedback.error(message);
    } catch {
      setError(t.errors.failed);
      feedback.error(t.errors.failed);
    }
    setState("idle");
  }

  const busy = state !== "idle";
  return (
    <div className="text-center sm:text-left">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="btn-primary px-8 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === "preparing" ? t.preparing : state === "redirecting" ? t.redirecting : t.pay}
      </button>
      <p className="text-xs text-ocean/50 mt-2 max-w-xs">{t.hint}</p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
