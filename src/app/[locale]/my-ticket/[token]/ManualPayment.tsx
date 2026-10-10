"use client";

import { useId, useState } from "react";
import Image from "next/image";

type Tab = "qr" | "link";

const TEXTS = {
  ru: {
    qr: "QR-код",
    link: "Оплатить по ссылке",
    recommended: "Рекомендуется",
    qrHint: "Отсканируйте QR-код в приложении банка.",
    go: "Перейти к оплате",
    linkHint: "Страница оплаты откроется в новой вкладке. После оплаты вернитесь сюда.",
  },
  kk: {
    qr: "QR-код",
    link: "Сілтеме арқылы төлеу",
    recommended: "Ұсынылады",
    qrHint: "QR-кодты банк қосымшасында сканерлеңіз.",
    go: "Төлемге өту",
    linkHint: "Төлем беті жаңа қойындыда ашылады. Төлегеннен кейін осында оралыңыз.",
  },
};

/**
 * One manual payment method (paid by the buyer, confirmed by staff): its QR code and/or its
 * payment link. With both, two tabs switch between them; with one, just that one.
 */
export default function ManualPayment({
  name,
  isDefault,
  qrUrl,
  paymentUrl,
  locale,
}: {
  name: string;
  isDefault: boolean;
  qrUrl: string | null;
  paymentUrl: string | null;
  locale: "ru" | "kk";
}) {
  const t = TEXTS[locale];
  const tabs: Tab[] = [...(qrUrl ? (["qr"] as const) : []), ...(paymentUrl ? (["link"] as const) : [])];
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "qr");
  const id = useId();

  return (
    <div className="bg-cream/30 rounded-2xl p-4">
      <p className="text-sm font-semibold text-ocean text-center sm:text-left">
        {name}
        {isDefault && (
          <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/15 text-ocean-dark">
            {t.recommended}
          </span>
        )}
      </p>

      {tabs.length > 1 && (
        <div role="tablist" className="mt-3 inline-flex w-full sm:w-auto p-1 rounded-full bg-white border border-cream-dark">
          {tabs.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${id}-${value}-tab`}
              aria-selected={tab === value}
              aria-controls={`${id}-${value}`}
              onClick={() => setTab(value)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === value ? "bg-ocean text-cream" : "text-ocean/70 hover:text-ocean"
              }`}
            >
              {value === "qr" ? t.qr : t.link}
            </button>
          ))}
        </div>
      )}

      {tab === "qr" && qrUrl && (
        <div
          id={`${id}-qr`}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={tabs.length > 1 ? `${id}-qr-tab` : undefined}
          className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-4"
        >
          <div className="relative w-48 h-48 shrink-0 rounded-2xl overflow-hidden border border-cream-dark bg-white">
            <Image src={qrUrl} alt={`${t.qr}: ${name}`} fill className="object-contain" />
          </div>
          <p className="text-sm text-ocean/60 text-center sm:text-left">{t.qrHint}</p>
        </div>
      )}

      {tab === "link" && paymentUrl && (
        <div
          id={`${id}-link`}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={tabs.length > 1 ? `${id}-link-tab` : undefined}
          className="mt-4 text-center sm:text-left"
        >
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            {t.go}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5v5M19 5l-8 8M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4" />
            </svg>
          </a>
          <p className="text-xs text-ocean/50 mt-2">{t.linkHint}</p>
        </div>
      )}
    </div>
  );
}
