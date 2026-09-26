import Link from "next/link";

/** Sub-pages of Билеты (Залы, Способы оплаты, Ожидают оплаты) link back here,
 * not all the way to the dashboard — Билеты is the item in the sidebar. */
export default function BackToTickets() {
  return (
    <Link
      href="/admin/tickets"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
      Билеты
    </Link>
  );
}
