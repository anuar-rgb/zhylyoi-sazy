"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

type Snapshot = {
  orderNumber: string;
  status: "PENDING" | "PAID" | "FREE" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  payment: "none" | "pending" | "processing" | "success" | "failed" | "cancelled" | "refunded";
  amount: number;
  currency: string;
};

const TEXTS = {
  ru: {
    waiting: "Ожидаем подтверждение оплаты…",
    waitingNote: "Банк сообщает нам о платеже сам. Эта страница обновится автоматически.",
    slow: "Платёж обрабатывается",
    slowNote:
      "Банк ещё не подтвердил оплату. Это нормально, иногда нужно несколько минут. Мы подтвердим заказ, как только банк ответит. Страницу можно закрыть и вернуться по ссылке на бронь.",
    paid: "Оплата прошла успешно",
    paidNote: "Ваши билеты готовы.",
    free: "Бронь подтверждена",
    failed: "Оплата не прошла",
    failedNote: "Деньги не списаны. Вы можете попробовать ещё раз, пока держится бронь.",
    expired: "Время брони истекло",
    expiredNote: "Места освобождены. Выберите места заново.",
    cancelled: "Заказ отменён",
    refunded: "Деньги возвращены",
    notFound: "Заказ не найден",
    notFoundNote: "Проверьте ссылку.",
    order: "Заказ",
    open: "Открыть билеты",
    retry: "Попробовать снова",
    again: "Выбрать места заново",
  },
  kk: {
    waiting: "Төлемнің расталуын күтудеміз…",
    waitingNote: "Банк төлем туралы бізге өзі хабарлайды. Бұл бет автоматты түрде жаңарады.",
    slow: "Төлем өңделуде",
    slowNote:
      "Банк төлемді әлі растаған жоқ. Бұл қалыпты жағдай, кейде бірнеше минут қажет. Банк жауап беруімен тапсырысты растаймыз. Бетті жауып, бронь сілтемесімен кейін қайта кіруге болады.",
    paid: "Төлем сәтті өтті",
    paidNote: "Билеттеріңіз дайын.",
    free: "Бронь расталды",
    failed: "Төлем өтпеді",
    failedNote: "Ақша алынбады. Бронь ұсталып тұрғанда қайталап көруге болады.",
    expired: "Бронь уақыты аяқталды",
    expiredNote: "Орындар босатылды. Орындарды қайта таңдаңыз.",
    cancelled: "Тапсырыс бас тартылды",
    refunded: "Ақша қайтарылды",
    notFound: "Тапсырыс табылмады",
    notFoundNote: "Сілтемені тексеріңіз.",
    order: "Тапсырыс",
    open: "Билеттерді ашу",
    retry: "Қайталап көру",
    again: "Орындарды қайта таңдау",
  },
} as const;

const POLL_MS = 3000;
const POLL_LIMIT = 40; // two minutes, then stop: a page must not hammer the server for ever

/**
 * Shows what the SERVER says about the order. The address the buyer arrived at (success, failure,
 * pending) is only what the bank claimed; it is never believed. Until the backend itself reports
 * the order paid, this page does not say so.
 */
export default function PaymentStatus({ token }: { token: string }) {
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [missing, setMissing] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function check() {
      attempts.current += 1;
      try {
        const res = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        if (stopped) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as Snapshot;
          setSnapshot(data);
          const settled =
            data.status !== "PENDING" || data.payment === "failed" || data.payment === "cancelled";
          if (settled) return;
        }
      } catch {
        // a network blip is not a result; try again
      }
      if (attempts.current >= POLL_LIMIT) {
        setGaveUp(true);
        return;
      }
      timer = window.setTimeout(check, POLL_MS);
    }

    check();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [token]);

  let title: string = t.waiting;
  let note: string | null = t.waitingNote;
  let tone: "wait" | "ok" | "bad" = "wait";
  let action: { href: string; label: string } | null = null;

  if (missing) {
    title = t.notFound;
    note = t.notFoundNote;
    tone = "bad";
  } else if (snapshot) {
    const ticketsHref = `/my-ticket/${token}`;
    if (snapshot.status === "PAID" || snapshot.status === "FREE") {
      title = snapshot.status === "PAID" ? t.paid : t.free;
      note = t.paidNote;
      tone = "ok";
      action = { href: ticketsHref, label: t.open };
    } else if (snapshot.status === "EXPIRED") {
      title = t.expired;
      note = t.expiredNote;
      tone = "bad";
    } else if (snapshot.status === "CANCELLED") {
      title = t.cancelled;
      note = null;
      tone = "bad";
    } else if (snapshot.status === "REFUNDED") {
      title = t.refunded;
      note = null;
      tone = "bad";
    } else if (snapshot.payment === "failed" || snapshot.payment === "cancelled") {
      title = t.failed;
      note = t.failedNote;
      tone = "bad";
      action = { href: ticketsHref, label: t.retry };
    } else if (gaveUp) {
      title = t.slow;
      note = t.slowNote;
      action = { href: ticketsHref, label: t.open };
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8 text-center" aria-live="polite">
      <div
        className={`mx-auto mb-5 grid place-items-center w-14 h-14 rounded-full text-white ${
          tone === "ok" ? "bg-ocean" : tone === "bad" ? "bg-red-600" : "bg-gold"
        }`}
        aria-hidden
      >
        {tone === "ok" ? (
          <svg viewBox="0 0 20 20" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.2 3.2L15 6.8" />
          </svg>
        ) : tone === "bad" ? (
          <svg viewBox="0 0 20 20" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" d="M6 6l8 8M14 6l-8 8" />
          </svg>
        ) : (
          <span className="block w-6 h-6 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
        )}
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-ocean">{title}</h1>
      {note && <p className="text-sm text-ocean/60 mt-2 max-w-md mx-auto">{note}</p>}

      {snapshot && (
        <p className="text-xs text-ocean/50 mt-4">
          {t.order} {snapshot.orderNumber} · {snapshot.amount > 0 ? `${snapshot.amount} ₸` : ""}
        </p>
      )}

      {action && (
        <Link href={action.href} className="btn-primary inline-block mt-6 px-8 py-3 text-sm font-semibold">
          {action.label}
        </Link>
      )}
    </div>
  );
}
