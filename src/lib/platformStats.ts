import { INSTITUTION_OFFSET_MS } from "@/lib/timeZone";

/**
 * Figures for the platform owner's «Статистика»: what each institution sold, refunded, staged and
 * received in a period. Pure functions over rows already read, so the arithmetic is tested apart
 * from the database.
 */

export const STAT_PERIODS = ["month", "prev", "year", "all"] as const;
export type StatPeriod = (typeof STAT_PERIODS)[number];

export const STAT_PERIOD_LABELS: Record<StatPeriod, string> = {
  month: "Этот месяц",
  prev: "Прошлый месяц",
  year: "Этот год",
  all: "Всё время",
};

export function parseStatPeriod(value: unknown): StatPeriod {
  return STAT_PERIODS.includes(value as StatPeriod) ? (value as StatPeriod) : "month";
}

/** The period's bounds as instants; months and years start at midnight in Atyrau, not in UTC. */
export function statPeriodRange(period: StatPeriod, now: Date = new Date()): { from: Date | null; to: Date | null } {
  if (period === "all") return { from: null, to: null };
  const local = new Date(now.getTime() + INSTITUTION_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const at = (year: number, month: number) => new Date(Date.UTC(year, month, 1) - INSTITUTION_OFFSET_MS);
  if (period === "month") return { from: at(y, m), to: at(y, m + 1) };
  if (period === "prev") return { from: at(y, m - 1), to: at(y, m) };
  return { from: at(y, 0), to: at(y + 1, 0) };
}

export function inRange(value: string | null | undefined, range: { from: Date | null; to: Date | null }): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t >= range.to.getTime()) return false;
  return true;
}

export type StatBooking = {
  organizationId: string;
  status: string;
  totalAmount: number | null;
  confirmedAt: string | null;
  refundedAt: string | null;
  refundedAmount: number | null;
  /** Tickets in the order that were not released back to sale. */
  tickets: number;
};

export type StatEvent = { organizationId: string; status: string; eventDate: string | null; cancelledAt: string | null };
export type StatApplication = { organizationId: string; createdAt: string };

export type InstitutionStats = {
  orders: number;
  tickets: number;
  amount: number;
  refunds: number;
  refundedAmount: number;
  eventsPast: number;
  eventsAhead: number;
  applications: number;
};

export const EMPTY_STATS: InstitutionStats = {
  orders: 0,
  tickets: 0,
  amount: 0,
  refunds: 0,
  refundedAmount: 0,
  eventsPast: 0,
  eventsAhead: 0,
  applications: 0,
};

/** An order counts as sold once confirmed; a later refund is counted apart, on the day it was made. */
const SOLD = new Set(["confirmed", "refunded"]);

export function institutionStats(
  input: { bookings: StatBooking[]; events: StatEvent[]; applications: StatApplication[] },
  range: { from: Date | null; to: Date | null },
  now: Date = new Date()
): Map<string, InstitutionStats> {
  const out = new Map<string, InstitutionStats>();
  const row = (id: string) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = { ...EMPTY_STATS }));
    return s;
  };

  for (const b of input.bookings) {
    if (SOLD.has(b.status) && inRange(b.confirmedAt, range)) {
      const s = row(b.organizationId);
      s.orders += 1;
      s.tickets += b.tickets;
      s.amount += Number(b.totalAmount ?? 0);
    }
    if (b.status === "refunded" && inRange(b.refundedAt, range)) {
      const s = row(b.organizationId);
      s.refunds += 1;
      s.refundedAmount += Number(b.refundedAmount ?? b.totalAmount ?? 0);
    }
  }

  for (const e of input.events) {
    if (e.status !== "published" || e.cancelledAt || !e.eventDate) continue;
    const t = new Date(e.eventDate).getTime();
    if (t >= now.getTime()) row(e.organizationId).eventsAhead += 1;
    else if (inRange(e.eventDate, range)) row(e.organizationId).eventsPast += 1;
  }

  for (const a of input.applications) {
    if (inRange(a.createdAt, range)) row(a.organizationId).applications += 1;
  }

  return out;
}

export function sumStats(rows: InstitutionStats[]): InstitutionStats {
  const total = { ...EMPTY_STATS };
  for (const r of rows) for (const k of Object.keys(total) as (keyof InstitutionStats)[]) total[k] += r[k];
  return total;
}

export function formatTenge(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(amount))} ₸`;
}
