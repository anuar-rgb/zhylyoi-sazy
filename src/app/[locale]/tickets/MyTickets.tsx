"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deviceStorage, readTokens, removeTokens } from "@/lib/myTickets";
import type { TicketSummary } from "@/lib/ticketing/myTickets";

const TEXTS = {
  ru: {
    title: "Мои билеты",
    note: "Билеты, купленные с этого устройства. Они хранятся здесь, пока мероприятие не удалено.",
    past: "Прошедшие мероприятия",
    order: "Заказ",
    tickets: (n: number) => `${n} ${n === 1 ? "билет" : n >= 2 && n <= 4 ? "билета" : "билетов"}`,
    open: "Открыть билеты",
    pay: "Продолжить оплату",
    details: "Подробнее",
    remove: "Убрать с этого устройства",
    paid: "Билеты готовы",
    free: "Бронь подтверждена",
    pending: "Ожидает оплаты",
    refunded: "Деньги возвращены",
  },
  kk: {
    title: "Менің билеттерім",
    note: "Осы құрылғыдан сатып алынған билеттер. Іс-шара жойылғанша осында сақталады.",
    past: "Өткен іс-шаралар",
    order: "Тапсырыс",
    tickets: (n: number) => `${n} билет`,
    open: "Билеттерді ашу",
    pay: "Төлемді жалғастыру",
    details: "Толығырақ",
    remove: "Осы құрылғыдан алып тастау",
    paid: "Билеттер дайын",
    free: "Бронь расталды",
    pending: "Төлем күтілуде",
    refunded: "Ақша қайтарылды",
  },
} as const;

const TONE: Record<string, string> = {
  PAID: "bg-gold/15 text-ocean-dark",
  FREE: "bg-gold/15 text-ocean-dark",
  PENDING: "bg-blue-50 text-blue-700",
  REFUNDED: "bg-ocean/5 text-ocean/60",
};

/**
 * "Мои билеты": the bookings this device has made, at the top of the Билеты page.
 *
 * The device remembers only the secret tokens (src/lib/myTickets.ts); what is shown is fetched
 * from the server each time. A booking the server no longer has (its event was deleted in the
 * admin) and one that can no longer be used (expired, cancelled) is dropped from the device.
 * Nothing at all is drawn when there is nothing to show, so a first-time visitor sees no trace of it.
 */
export default function MyTickets() {
  const locale = useLocale();
  const t = TEXTS[locale === "kk" ? "kk" : "ru"];
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);

  useEffect(() => {
    const storage = deviceStorage();
    if (!storage) return;
    const tokens = readTokens(storage);
    if (tokens.length === 0) return;

    let cancelled = false;
    fetch("/api/my-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tickets?: TicketSummary[] } | null) => {
        if (cancelled || !data?.tickets) return; // a failed lookup forgets nothing
        const alive = data.tickets.filter((x) => x.status !== "EXPIRED" && x.status !== "CANCELLED");
        const keep = new Set(alive.map((x) => x.token.toLowerCase()));
        const drop = tokens.filter((tok) => !keep.has(tok));
        if (drop.length > 0) removeTokens(storage, drop);

        // Newest purchases first, in the order the device remembers them.
        const order = new Map(tokens.map((tok, i) => [tok, i]));
        setTickets(alive.sort((a, b) => (order.get(a.token.toLowerCase()) ?? 0) - (order.get(b.token.toLowerCase()) ?? 0)));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function forget(token: string) {
    const storage = deviceStorage();
    if (storage) removeTokens(storage, [token]);
    setTickets((current) => (current ? current.filter((x) => x.token !== token) : current));
  }

  if (!tickets || tickets.length === 0) return null;

  const upcoming = tickets.filter((x) => !(x.started && x.status === "PENDING") && !x.started);
  const finished = tickets.filter((x) => x.started && x.status !== "PENDING");

  const card = (x: TicketSummary) => {
    const title = (locale === "kk" ? (x.titleKk ?? x.titleRu) : (x.titleRu ?? x.titleKk)) ?? "";
    const label =
      x.status === "PAID" ? t.paid : x.status === "FREE" ? t.free : x.status === "REFUNDED" ? t.refunded : t.pending;
    const href = `/my-ticket/${x.token}`;
    const primary = x.status === "PENDING" ? t.pay : x.status === "REFUNDED" ? t.details : t.open;

    return (
      <li key={x.token} className="bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-ocean">{title}</h3>
            <p className="text-xs text-ocean/50">{locale === "kk" ? x.whenKk : x.whenRu}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${TONE[x.status] ?? TONE.REFUNDED}`}>{label}</span>
        </div>
        <p className="text-xs text-ocean/50 mt-2">
          {t.order} {x.orderNumber} · {t.tickets(x.tickets)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={href} className="btn-primary inline-flex px-5 py-2 text-sm font-semibold">
            {primary}
          </Link>
          <button
            type="button"
            onClick={() => forget(x.token)}
            className="text-xs font-semibold text-ocean/50 hover:text-ocean transition-colors"
          >
            {t.remove}
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="mb-12" aria-labelledby="my-tickets-title">
      <h2 id="my-tickets-title" className="text-xl sm:text-2xl font-bold text-ocean">
        {t.title}
      </h2>
      <p className="text-sm text-ocean/60 mt-1 mb-4">{t.note}</p>

      {upcoming.length > 0 && <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(card)}</ul>}

      {finished.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ocean/70 hover:text-ocean">{t.past}</summary>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">{finished.map(card)}</ul>
        </details>
      )}
    </section>
  );
}
