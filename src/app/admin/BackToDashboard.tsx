import Link from "next/link";

/**
 * Новости, Афиша, Кружки and Заявки have no entry of their own in the sidebar —
 * AdminNav.tsx explains why — so once someone is inside one, the only way back is
 * the sidebar's Дашборд item, which is easy to miss since it never highlights as
 * the current page here. This puts an explicit way back right above the heading.
 */
export default function BackToDashboard() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
      Дашборд
    </Link>
  );
}
