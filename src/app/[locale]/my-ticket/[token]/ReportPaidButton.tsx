"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { reportBookingPayment } from "@/app/actions/bookings";

const TEXTS = {
  ru: {
    button: "Я оплатил",
    hint: "Нажмите после перевода. Это не подтверждает оплату: кассир проверит поступление и выдаст билеты.",
    confirmTitle: "Вы уже перевели деньги?",
    confirmMessage: "Кассир проверит поступление в Kaspi. Билеты появятся на этой странице после проверки.",
    confirmLabel: "Да, я оплатил",
    done: "Спасибо! Кассир проверит оплату",
    expired: "Время брони истекло. Если вы уже оплатили, свяжитесь с учреждением.",
    notPending: "Этот заказ уже не ожидает оплаты.",
    failed: "Не удалось отправить. Попробуйте ещё раз.",
  },
  kk: {
    button: "Мен төледім",
    hint: "Аударымнан кейін басыңыз. Бұл төлемді растамайды: кассир түсімді тексеріп, билеттерді береді.",
    confirmTitle: "Ақшаны аудардыңыз ба?",
    confirmMessage: "Кассир Kaspi-дегі түсімді тексереді. Билеттер тексерістен кейін осы бетте пайда болады.",
    confirmLabel: "Иә, төледім",
    done: "Рахмет! Кассир төлемді тексереді",
    expired: "Бронь уақыты өтті. Төлеп қойсаңыз, мекемеге хабарласыңыз.",
    notPending: "Бұл тапсырыс енді төлем күтпейді.",
    failed: "Жіберілмеді. Қайталап көріңіз.",
  },
};

/** «Я оплатил»: a note to the cashier, after a confirmation. Never treated as proof of payment. */
export default function ReportPaidButton({ token }: { token: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const confirmed = await feedback.confirm({ title: t.confirmTitle, message: t.confirmMessage, confirmLabel: t.confirmLabel });
    if (!confirmed) return;
    setBusy(true);
    const result = await reportBookingPayment(token);
    setBusy(false);
    if (result.ok) {
      feedback.success(t.done);
    } else {
      feedback.error(result.error === "expired" ? t.expired : result.error === "not_pending" ? t.notPending : t.failed);
    }
    router.refresh();
  }

  return (
    <div className="mt-5 pt-5 border-t border-cream-dark text-center sm:text-left">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "…" : t.button}
      </button>
      <p className="text-xs text-ocean/50 mt-2">{t.hint}</p>
    </div>
  );
}
