import Link from "next/link";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default function TicketsPage() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Билеты</h1>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-1">Залы и места</p>
        <p className="text-xs text-ocean/40 mb-4">Залы и сетка мест — первый шаг. Билеты и бронь появятся позже.</p>
        <Link
          href="/admin/tickets/halls"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-gold-dark"
        >
          Залы
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
