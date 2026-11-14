import Link from "next/link";
import { notFound } from "next/navigation";
import { listInstitutions, platformAdmin } from "@/lib/platform";
import { formatDate } from "@/lib/timeZone";

export const metadata = { title: "Платформа" };

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

/**
 * The platform owner's list of institutions: each one's site, whether it is on, its admins and its
 * mailbox. Only for the platform admin; an institution's content (events, orders) is not here, it
 * is in that institution's own admin.
 */
export default async function PlatformPage() {
  const ctx = await platformAdmin();
  if (!ctx) notFound();
  const institutions = await listInstitutions(ctx.admin);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Учреждения</h1>
        <Link href="/admin/platform/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить учреждение
        </Link>
      </div>
      <p className="text-sm text-ocean/60 mb-6">
        Учреждения на платформе: {institutions.length}. Здесь их сайты, администраторы и почта. Мероприятия, заказы и
        тексты каждое учреждение ведёт в своей панели.
      </p>

      <ul className="space-y-3">
        {institutions.map((row) => (
          <li key={row.id} className={`${CARD} relative p-4 sm:p-5`}>
            <Link href={`/admin/platform/${row.id}`} className="absolute inset-0 rounded-3xl" aria-label={`Открыть: ${row.name}`} />
            <div className="flex flex-wrap items-start justify-between gap-3 pointer-events-none">
              <div className="min-w-0">
                <p className="font-semibold text-ocean break-words">{row.name}</p>
                <p className="text-sm text-ocean/60 break-all">{row.domain ?? "домен не задан"}</p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                  row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {row.isActive ? "Сайт включён" : "Сайт выключен"}
              </span>
            </div>
            <p className="text-xs text-ocean/60 mt-2 pointer-events-none">
              Администраторы: {row.admins.length > 0 ? row.admins.map((a) => a.email || a.name).join(", ") : "нет"}
              {" · "}
              Почта: {row.mailConfigured ? "настроена" : "не настроена"}
              {" · "}
              Добавлено {formatDate(row.createdAt, "ru-RU")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
