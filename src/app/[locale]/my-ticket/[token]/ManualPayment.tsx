"use client";

const TEXTS = {
  ru: {
    recommended: "Рекомендуется",
    go: "Перейти к оплате",
    linkHint: "Откроется приложение или страница банка. После оплаты вернитесь сюда.",
  },
  kk: {
    recommended: "Ұсынылады",
    go: "Төлемге өту",
    linkHint: "Банк қосымшасы немесе беті ашылады. Төлегеннен кейін осында оралыңыз.",
  },
};

/** One manual payment method (paid by the buyer, confirmed by staff): its payment link as a button. */
export default function ManualPayment({
  name,
  isDefault,
  paymentUrl,
  locale,
}: {
  name: string;
  isDefault: boolean;
  paymentUrl: string;
  locale: "ru" | "kk";
}) {
  const t = TEXTS[locale];

  return (
    <div className="bg-cream/30 rounded-2xl p-4 text-center sm:text-left">
      <p className="text-sm font-semibold text-ocean">
        {name}
        {isDefault && (
          <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/15 text-ocean-dark">
            {t.recommended}
          </span>
        )}
      </p>

      <a
        href={paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-4 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
      >
        {t.go}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5v5M19 5l-8 8M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-4" />
        </svg>
      </a>
      <p className="text-xs text-ocean/50 mt-2">{t.linkHint}</p>
    </div>
  );
}
