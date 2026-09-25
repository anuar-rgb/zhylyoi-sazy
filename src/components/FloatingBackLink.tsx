import { Link } from "@/i18n/navigation";

/**
 * A back button that stays on screen while scrolling, for pages long enough that
 * the usual inline "← Назад" at the top or bottom is out of view most of the time
 * — a collective's own page, for one, now that it also carries its repertoire and
 * recordings. Bottom-left rather than top-left: the header is itself sticky, and
 * bottom-right is where the (now removed) contact buttons used to sit, so this
 * claims a corner nothing else uses.
 */
export default function FloatingBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-ocean text-cream shadow-lg flex items-center justify-center hover:bg-ocean-light hover:scale-110 active:scale-95 transition-all duration-200"
    >
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
    </Link>
  );
}
