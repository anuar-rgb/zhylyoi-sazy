import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPendingPaidBookings } from "@/lib/bookingsAdmin";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-gold-dark">
      {label}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </Link>
  );
}

export default async function TicketsPage() {
  const identity = await getStaffIdentity();
  const organizationId = identity?.organizationId ?? (await getSiteOrganizationId());
  const pendingCount = organizationId ? (await listPendingPaidBookings(organizationId)).length : 0;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Билеты</h1>

      <div className="space-y-4">
        <div className={CARD}>
          <p className="text-sm font-semibold text-ocean mb-1">Залы и места</p>
          <p className="text-xs text-ocean/40 mb-4">Залы и сетка мест — кто где сидит.</p>
          <CardLink href="/admin/tickets/halls" label="Залы" />
        </div>

        <div className={CARD}>
          <p className="text-sm font-semibold text-ocean mb-1">Способы оплаты</p>
          <p className="text-xs text-ocean/40 mb-4">
            Статический QR от Kaspi/Halyk для платных броней. API-приём платежей — следующий шаг.
          </p>
          <CardLink href="/admin/tickets/payments" label="Способы оплаты" />
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-ocean">Ожидают оплаты</p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold leading-none">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-xs text-ocean/40 mb-4">Платные брони, где место держится, но оплату ещё не подтвердили.</p>
          <CardLink href="/admin/tickets/bookings" label="Ожидают оплаты" />
        </div>

        <div className={CARD}>
          <p className="text-sm font-semibold text-ocean mb-1">Сканер билетов</p>
          <p className="text-xs text-ocean/40 mb-4">Подтверждение билета на входе — камера или код вручную.</p>
          <CardLink href="/admin/tickets/scan" label="Сканер" />
        </div>
      </div>
    </div>
  );
}
