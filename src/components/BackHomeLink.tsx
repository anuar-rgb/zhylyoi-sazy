import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LABEL: Record<Locale, string> = { kk: "Басты бетке", ru: "На главную" };

/**
 * A way back to the site from a document page. The browser's Back goes wherever the visitor came
 * from, and a document opened from the purchase form is in a new tab with no Back at all.
 */
export default function BackHomeLink({ locale }: { locale: Locale }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 mb-5 py-1 text-sm font-semibold text-ocean/70 hover:text-ocean transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
      {LABEL[locale]}
    </Link>
  );
}
