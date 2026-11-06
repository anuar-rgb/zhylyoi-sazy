"use client";

import { useState } from "react";
import Script from "next/script";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CheckoutForm } from "@/lib/payments/types";

const TEXTS = {
  ru: {
    opening: "Открываем форму оплаты…",
    hint: "Данные карты вводятся на странице банка. Мы их не видим и не храним.",
    failed: "Не удалось открыть форму оплаты. Места пока за вами, попробуйте ещё раз.",
    back: "Вернуться к заказу",
  },
  kk: {
    opening: "Төлем нысаны ашылуда…",
    hint: "Карта деректері банк бетінде енгізіледі. Біз оларды көрмейміз және сақтамаймыз.",
    failed: "Төлем нысанын ашу мүмкін болмады. Орындар әзірге сізде, қайталап көріңіз.",
    back: "Тапсырысқа оралу",
  },
} as const;

/** Hands over to the bank: its script takes the browser to its own page. */
export default function Checkout({ form, orderHref }: { form: CheckoutForm; orderHref: string }) {
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const [failed, setFailed] = useState(false);

  function open() {
    const halyk = (window as unknown as { halyk?: { pay?: (params: unknown) => void } }).halyk;
    if (halyk?.pay) halyk.pay(form.params);
    else setFailed(true);
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8 text-center" aria-live="polite">
          {failed ? (
            <>
              <p className="text-sm text-ocean">{t.failed}</p>
              <Link href={orderHref} className="btn-primary inline-block mt-6 px-8 py-3 text-sm font-semibold">
                {t.back}
              </Link>
            </>
          ) : (
            <>
              <span className="block mx-auto mb-5 w-10 h-10 rounded-full border-[3px] border-cream-dark border-t-ocean animate-spin" aria-hidden />
              <h1 className="text-lg font-bold text-ocean">{t.opening}</h1>
              <p className="text-xs text-ocean/50 mt-2">{t.hint}</p>
            </>
          )}
        </div>
      </div>
      <Script src={form.scriptUrl} strategy="afterInteractive" onLoad={open} onError={() => setFailed(true)} />
    </section>
  );
}
