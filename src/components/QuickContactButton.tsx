import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

const content: Record<Locale, { whatsapp: string; call: string }> = {
  kk: { whatsapp: "WhatsApp арқылы жазу", call: "Қоңырау шалу" },
  ru: { whatsapp: "Написать в WhatsApp", call: "Позвонить" },
};

const PHONE_DISPLAY = "+7 778 927 63 87";
const PHONE_DIGITS = "77789276387";

export default async function QuickContactButton() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-30 flex flex-col items-end gap-3">
      <a
        href={`https://wa.me/${PHONE_DIGITS}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.whatsapp}
        title={t.whatsapp}
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] motion-safe:animate-ping opacity-40" />
        <svg className="relative w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.31.65 4.47 1.78 6.31L4 29l7.86-1.75A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.8c-1.98 0-3.83-.55-5.41-1.5l-.39-.23-4.66 1.04 1.03-4.54-.25-.4A9.7 9.7 0 0 1 5.2 15c0-5.96 4.85-10.8 10.8-10.8S26.8 9.04 26.8 15 21.96 24.8 16.004 24.8Zm5.94-8.1c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.43 5.44 4.8.76.33 1.35.53 1.82.68.76.24 1.46.21 2.01.13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </a>
      <a
        href={`tel:+${PHONE_DIGITS}`}
        aria-label={`${t.call}: ${PHONE_DISPLAY}`}
        title={`${t.call}: ${PHONE_DISPLAY}`}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-ocean text-cream shadow-lg flex items-center justify-center hover:bg-ocean-light hover:scale-110 active:scale-95 transition-all duration-200"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.28a1 1 0 01.97.76l1.1 4.4a1 1 0 01-.5 1.11l-1.8.9a12.04 12.04 0 006.29 6.3l.9-1.81a1 1 0 011.11-.5l4.4 1.1a1 1 0 01.76.97V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
        </svg>
      </a>
    </div>
  );
}
