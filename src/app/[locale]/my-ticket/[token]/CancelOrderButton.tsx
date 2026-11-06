"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { cancelBooking } from "@/app/actions/bookings";

const TEXTS = {
  ru: {
    button: "Отменить и выбрать другие места",
    title: "Отменить заказ?",
    message: "Места сразу освободятся. Выбрать их снова получится, только если их не займёт кто-то другой.",
    confirm: "Да, отменить",
    keep: "Нет",
    done: "Заказ отменён",
    failed: "Не удалось отменить заказ. Обновите страницу.",
  },
  kk: {
    button: "Бас тартып, басқа орын таңдау",
    title: "Тапсырыстан бас тартасыз ба?",
    message: "Орындар бірден босайды. Оларды басқа біреу алмаса ғана қайта таңдай аласыз.",
    confirm: "Иә, бас тарту",
    keep: "Жоқ",
    done: "Тапсырыстан бас тартылды",
    failed: "Тапсырыстан бас тарту мүмкін болмады. Бетті жаңартыңыз.",
  },
} as const;

/** Lets the buyer let the seats go now instead of waiting for the hold to run out. */
export default function CancelOrderButton({ token, seatsHref }: { token: string; seatsHref: string | null }) {
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const feedback = useFeedback();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    const confirmed = await feedback.confirm({ title: t.title, message: t.message, confirmLabel: t.confirm, cancelLabel: t.keep, danger: true });
    if (!confirmed) return;
    setBusy(true);
    const result = await cancelBooking(token);
    setBusy(false);
    if (!result.ok) {
      feedback.error(t.failed);
      router.refresh();
      return;
    }
    feedback.success(t.done);
    if (seatsHref) router.push(seatsHref);
    else router.refresh();
  }

  return (
    <button type="button" onClick={cancel} disabled={busy} className="mt-4 text-sm font-semibold text-ocean/60 hover:text-ocean disabled:opacity-50">
      {t.button}
    </button>
  );
}
