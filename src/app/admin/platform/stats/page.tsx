import Link from "next/link";
import { notFound } from "next/navigation";
import { listInstitutions, platformAdmin, platformStatsInput } from "@/lib/platform";
import {
  EMPTY_STATS,
  STAT_PERIODS,
  STAT_PERIOD_LABELS,
  formatTenge,
  institutionStats,
  parseStatPeriod,
  statPeriodRange,
  sumStats,
  type InstitutionStats,
} from "@/lib/platformStats";
import { formatDate } from "@/lib/timeZone";

export const metadata = { title: "Статистика" };

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

function Total({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className={`${CARD} p-5`}>
      <p className="text-sm font-semibold text-ocean mb-2">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-ocean break-words">{value}</p>
      {note && <p className="text-xs text-ocean/50 mt-2">{note}</p>}
    </div>
  );
}

/** When an institution's staff last signed in: today, yesterday, or the date. */
function sinceLabel(iso: string | undefined, now: Date): string {
  if (!iso) return "ни разу";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return formatDate(iso);
}

/**
 * The platform owner's figures across institutions: what each sold and refunded, what it staged and
 * how many applications it got, and when its staff last opened their panel. Read only.
 */
export default async function PlatformStatsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ctx = await platformAdmin();
  if (!ctx) notFound();
  const period = parseStatPeriod((await searchParams).p);
  const now = new Date();
  const range = statPeriodRange(period, now);
  const [institutions, input] = await Promise.all([listInstitutions(ctx.admin), platformStatsInput(ctx.admin, range.from)]);

  const byInstitution = input ? institutionStats(input, range, now) : new Map<string, InstitutionStats>();
  const rows = institutions.map((inst) => ({
    ...inst,
    stats: byInstitution.get(inst.id) ?? EMPTY_STATS,
    lastSignIn: input?.lastSignIn.get(inst.id),
  }));
  const total = sumStats(rows.map((r) => r.stats));
  const quiet = (iso: string | undefined) => !iso || now.getTime() - new Date(iso).getTime() > 30 * 86_400_000;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-4">Статистика</h1>

      <nav aria-label="Период" className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-6">
        {STAT_PERIODS.map((p) => (
          <Link
            key={p}
            href={p === "month" ? "/admin/platform/stats" : `/admin/platform/stats?p=${p}`}
            aria-current={p === period ? "page" : undefined}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              p === period ? "bg-ocean text-cream border-ocean" : "bg-white text-ocean/70 border-cream-dark hover:text-ocean"
            }`}
          >
            {STAT_PERIOD_LABELS[p]}
          </Link>
        ))}
      </nav>

      {!input ? (
        <div className={`${CARD} p-6`}>
          <p className="font-semibold text-ocean mb-1">Не удалось загрузить данные</p>
          <p className="text-sm text-ocean/60">Обновите страницу через минуту.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Total title="Продано билетов" value={String(total.tickets)} note={`Заказов: ${total.orders}`} />
            <Total title="На сумму" value={formatTenge(total.amount)} />
            <Total
              title="Возвраты"
              value={String(total.refunds)}
              note={total.refunds ? `На сумму ${formatTenge(total.refundedAmount)}` : undefined}
            />
            <Total title="Заявки в кружки" value={String(total.applications)} />
            <Total
              title="Мероприятия"
              value={String(total.eventsPast)}
              note={`Прошли за период · впереди: ${total.eventsAhead}`}
            />
          </div>

          <h2 className="text-lg font-bold text-ocean mt-8 mb-3">По учреждениям</h2>

          {/* Phones: one card per institution. */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id} className={`${CARD} p-4`}>
                <Link href={`/admin/platform/${r.id}`} className="font-semibold text-ocean break-words hover:underline">
                  {r.name}
                </Link>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                  <dt className="text-ocean/55">Билеты</dt>
                  <dd className="text-ocean font-semibold text-right">{r.stats.tickets}</dd>
                  <dt className="text-ocean/55">Сумма</dt>
                  <dd className="text-ocean font-semibold text-right">{formatTenge(r.stats.amount)}</dd>
                  <dt className="text-ocean/55">Возвраты</dt>
                  <dd className="text-ocean text-right">
                    {r.stats.refunds}
                    {r.stats.refunds > 0 && <> · {formatTenge(r.stats.refundedAmount)}</>}
                  </dd>
                  <dt className="text-ocean/55">Мероприятия</dt>
                  <dd className="text-ocean text-right">
                    {r.stats.eventsPast} прошли · {r.stats.eventsAhead} впереди
                  </dd>
                  <dt className="text-ocean/55">Заявки</dt>
                  <dd className="text-ocean text-right">{r.stats.applications}</dd>
                  <dt className="text-ocean/55">Вход в панель</dt>
                  <dd className={`text-right ${quiet(r.lastSignIn) ? "text-red-600 font-semibold" : "text-ocean"}`}>
                    {sinceLabel(r.lastSignIn, now)}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>

          {/* Wide screens: one table. */}
          <div className={`${CARD} hidden lg:block overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ocean/55 border-b border-cream-dark">
                  <th className="font-semibold px-5 py-3">Учреждение</th>
                  <th className="font-semibold px-3 py-3 text-right">Билеты</th>
                  <th className="font-semibold px-3 py-3 text-right">Сумма</th>
                  <th className="font-semibold px-3 py-3 text-right">Возвраты</th>
                  <th className="font-semibold px-3 py-3 text-right">Прошли</th>
                  <th className="font-semibold px-3 py-3 text-right">Впереди</th>
                  <th className="font-semibold px-3 py-3 text-right">Заявки</th>
                  <th className="font-semibold px-5 py-3 text-right">Вход в панель</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-cream-dark last:border-0 text-ocean">
                    <td className="px-5 py-3">
                      <Link href={`/admin/platform/${r.id}`} className="font-semibold hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{r.stats.tickets}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{formatTenge(r.stats.amount)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {r.stats.refunds}
                      {r.stats.refunds > 0 && <span className="text-ocean/55"> · {formatTenge(r.stats.refundedAmount)}</span>}
                    </td>
                    <td className="px-3 py-3 text-right">{r.stats.eventsPast}</td>
                    <td className="px-3 py-3 text-right">{r.stats.eventsAhead}</td>
                    <td className="px-3 py-3 text-right">{r.stats.applications}</td>
                    <td
                      className={`px-5 py-3 text-right whitespace-nowrap ${quiet(r.lastSignIn) ? "text-red-600 font-semibold" : ""}`}
                    >
                      {sinceLabel(r.lastSignIn, now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-ocean/50 mt-4 leading-relaxed">
            Продажа считается в день, когда оплату подтвердил банк или кассир; возврат в день возврата. Неоплаченные и
            отклонённые заказы не считаются. «Впереди» это все будущие мероприятия, независимо от периода. Красным отмечено
            учреждение, которое не заходило в панель больше 30 дней.
          </p>
        </>
      )}
    </div>
  );
}
