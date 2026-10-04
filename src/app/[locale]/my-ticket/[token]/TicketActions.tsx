"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { rememberTicket } from "@/lib/myTickets";

const TEXTS = {
  ru: {
    hint: "Билеты запоминаются на этом устройстве и всегда есть в разделе «Билеты». С другого устройства откройте эту ссылку.",
    copy: "Скопировать ссылку на билеты",
    copied: "Ссылка скопирована",
    failed: "Не удалось скопировать. Скопируйте адрес из строки браузера.",
    more: "Купить ещё билеты",
    mine: "Все мои билеты",
  },
  kk: {
    hint: "Билеттер осы құрылғыда сақталады және әрқашан «Билеттер» бөлімінде тұрады. Басқа құрылғыдан осы сілтемені ашыңыз.",
    copy: "Билет сілтемесін көшіру",
    copied: "Сілтеме көшірілді",
    failed: "Көшіру мүмкін болмады. Мекенжайды браузер жолынан көшіріңіз.",
    more: "Тағы билет сатып алу",
    mine: "Менің барлық билеттерім",
  },
} as const;

/**
 * Under a booking: remembers it on this device, and gives the buyer the ways back to it and on to
 * more tickets. The token in the address is the only key to the booking, so it can be copied to
 * open the same tickets on another device.
 */
export default function TicketActions({ token }: { token: string }) {
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const feedback = useFeedback();

  useEffect(() => {
    rememberTicket(token);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      feedback.success(t.copied);
    } catch {
      feedback.error(t.failed);
    }
  }

  return (
    <div className="mt-6 text-center">
      <p className="text-xs text-ocean/50 max-w-md mx-auto">{t.hint}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="px-5 py-2.5 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream transition-colors"
        >
          {t.copy}
        </button>
        <Link href="/tickets" className="btn-primary inline-flex px-5 py-2.5 text-sm font-semibold">
          {t.more}
        </Link>
      </div>
    </div>
  );
}
