import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { formatDateTime } from "@/lib/timeZone";

/**
 * Reads for the ticket-sales admin pages (orders, payments, check-in journal, statistics).
 *
 * All through the signed-in staff member's own client, so row-level security decides what is
 * visible; the organization filter only narrows it. A failed query returns an empty list rather
 * than taking the page down.
 */
type Row = Record<string, unknown>;

export type Scope = { ok: true; organizationId: string } | { ok: false; reason: "no_profile" | "no_organization" };

export async function getTicketingScope(): Promise<Scope> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, reason: "no_profile" };
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { ok: false, reason: "no_organization" };
  return { ok: true, organizationId };
}

function titleOf(event: unknown): string {
  const e = (Array.isArray(event) ? event[0] : event) as Row | null | undefined;
  return e ? String(e.title_ru ?? e.title_kk ?? "") : "";
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Timestamps are shown in the institution's time (Atyrau), not the server's. */
export function formatMoment(iso: string | null): string {
  if (!iso) return "—";
  return formatDateTime(iso);
}

export function formatMoney(amount: number, currency = "KZT"): string {
  const symbol = currency === "KZT" ? "₸" : currency;
  return `${amount.toLocaleString("ru-RU")} ${symbol}`;
}

// ---------------------------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------------------------
export type OrderFilter = "all" | "pending" | "paid" | "refunded" | "closed";

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  amount: number;
  currency: string;
  createdAt: string;
  confirmedAt: string | null;
  eventId: string;
  eventTitle: string;
  tickets: number;
  checkedIn: number;
  payment: { provider: string; status: string; paidAt: string | null; needsRefund: boolean; note: string | null } | null;
};

export async function listOrders(organizationId: string, filter: OrderFilter, eventId: string | null, limit = 100): Promise<OrderRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(
      "id, public_order_id, status, buyer_name, buyer_phone, total_amount, currency, created_at, confirmed_at, event_id, " +
        "culture_events(title_ru, title_kk), booking_items(checked_in_at), " +
        "payments(provider_code, status, paid_at, needs_refund, note, created_at)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "pending") query = query.eq("status", "pending");
  else if (filter === "paid") query = query.eq("status", "confirmed");
  else if (filter === "refunded") query = query.eq("status", "refunded");
  else if (filter === "closed") query = query.in("status", ["cancelled", "expired"]);
  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const items = (row.booking_items as Row[] | null) ?? [];
    const payments = ((row.payments as Row[] | null) ?? []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const last = payments[0];
    return {
      id: String(row.id),
      orderNumber: String(row.public_order_id),
      status: String(row.status),
      buyerName: String(row.buyer_name),
      buyerPhone: String(row.buyer_phone),
      amount: Number(row.total_amount) || 0,
      currency: String(row.currency ?? "KZT"),
      createdAt: String(row.created_at),
      confirmedAt: str(row.confirmed_at),
      eventId: String(row.event_id),
      eventTitle: titleOf(row.culture_events),
      tickets: items.length,
      checkedIn: items.filter((item) => item.checked_in_at).length,
      payment: last
        ? {
            provider: String(last.provider_code),
            status: String(last.status),
            paidAt: str(last.paid_at),
            needsRefund: last.needs_refund === true,
            note: str(last.note),
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Payments and the journal of what banks sent
// ---------------------------------------------------------------------------------------------
export type PaymentRow = {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  amount: number;
  currency: string;
  needsRefund: boolean;
  note: string | null;
  failureReason: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  orderNumber: string;
  buyerName: string;
  eventTitle: string;
};

export async function listPayments(organizationId: string, limit = 100): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, provider_code, provider_payment_id, status, amount, currency, needs_refund, note, failure_reason, paid_at, refunded_at, created_at, " +
        "bookings(public_order_id, buyer_name, culture_events(title_ru, title_kk))"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const booking = (Array.isArray(row.bookings) ? row.bookings[0] : row.bookings) as Row | null;
    return {
      id: String(row.id),
      provider: String(row.provider_code),
      providerPaymentId: str(row.provider_payment_id),
      status: String(row.status),
      amount: Number(row.amount) || 0,
      currency: String(row.currency ?? "KZT"),
      needsRefund: row.needs_refund === true,
      note: str(row.note),
      failureReason: str(row.failure_reason),
      paidAt: str(row.paid_at),
      refundedAt: str(row.refunded_at),
      createdAt: String(row.created_at),
      orderNumber: booking ? String(booking.public_order_id) : "—",
      buyerName: booking ? String(booking.buyer_name) : "",
      eventTitle: booking ? titleOf(booking.culture_events) : "",
    };
  });
}

export type WebhookEventRow = {
  id: string;
  provider: string;
  eventType: string | null;
  status: string;
  error: string | null;
  receivedAt: string;
};

export async function listWebhookEvents(organizationId: string, limit = 30): Promise<WebhookEventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_webhook_events")
    .select("id, provider_code, event_type, status, error, received_at")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as Row[]).map((row) => ({
    id: String(row.id),
    provider: String(row.provider_code),
    eventType: str(row.event_type),
    status: String(row.status),
    error: str(row.error),
    receivedAt: String(row.received_at),
  }));
}

// ---------------------------------------------------------------------------------------------
// Check-in journal
// ---------------------------------------------------------------------------------------------
export type CheckinRow = {
  id: string;
  result: string;
  checkedAt: string;
  orderNumber: string | null;
  seat: string | null;
  eventTitle: string;
  employee: string | null;
};

export async function listCheckins(organizationId: string, eventId: string | null, limit = 100): Promise<CheckinRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ticket_checkins")
    .select(
      "id, result, checked_at, ticket_event_id, bookings(public_order_id), " +
        "booking_items(hall_seats(row_label, seat_number)), culture_events!ticket_event_id(title_ru, title_kk), profiles(full_name)"
    )
    .eq("organization_id", organizationId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (eventId) query = query.eq("ticket_event_id", eventId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const booking = (Array.isArray(row.bookings) ? row.bookings[0] : row.bookings) as Row | null;
    const item = (Array.isArray(row.booking_items) ? row.booking_items[0] : row.booking_items) as Row | null;
    const seat = item ? ((Array.isArray(item.hall_seats) ? item.hall_seats[0] : item.hall_seats) as Row | null) : null;
    const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as Row | null;
    return {
      id: String(row.id),
      result: String(row.result),
      checkedAt: String(row.checked_at),
      orderNumber: booking ? String(booking.public_order_id) : null,
      seat: seat ? `Ряд ${seat.row_label}, место ${seat.seat_number}` : null,
      eventTitle: titleOf(row.culture_events),
      employee: profile ? str(profile.full_name) : null,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Statistics per event
// ---------------------------------------------------------------------------------------------
export type EventStats = {
  eventId: string;
  sold: number;
  waiting: number;
  cancelled: number;
  refunded: number;
  checkedIn: number;
  notCame: number;
  revenue: number;
};

/** What each tile means is spelled out in the page; the arithmetic lives here, in one place. */
export function summarizeEvent(
  eventId: string,
  bookings: { status: string; total: number; items: { checkedIn: boolean }[] }[]
): EventStats {
  const stats: EventStats = { eventId, sold: 0, waiting: 0, cancelled: 0, refunded: 0, checkedIn: 0, notCame: 0, revenue: 0 };
  for (const booking of bookings) {
    const tickets = booking.items.length;
    if (booking.status === "confirmed") {
      stats.sold += tickets;
      stats.revenue += booking.total;
      const entered = booking.items.filter((item) => item.checkedIn).length;
      stats.checkedIn += entered;
      stats.notCame += tickets - entered;
    } else if (booking.status === "pending") stats.waiting += tickets;
    else if (booking.status === "refunded") stats.refunded += tickets;
    else stats.cancelled += tickets; // cancelled and expired holds
  }
  return stats;
}

export async function getEventStats(organizationId: string): Promise<Map<string, EventStats>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("event_id, status, total_amount, booking_items(checked_in_at)")
    .eq("organization_id", organizationId);
  if (error || !data) return new Map();

  const byEvent = new Map<string, { status: string; total: number; items: { checkedIn: boolean }[] }[]>();
  for (const row of data as unknown as Row[]) {
    const id = String(row.event_id);
    const list = byEvent.get(id) ?? [];
    list.push({
      status: String(row.status),
      total: Number(row.total_amount) || 0,
      items: ((row.booking_items as Row[] | null) ?? []).map((item) => ({ checkedIn: Boolean(item.checked_in_at) })),
    });
    byEvent.set(id, list);
  }

  const result = new Map<string, EventStats>();
  for (const [id, bookings] of byEvent) result.set(id, summarizeEvent(id, bookings));
  return result;
}

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Подтверждён",
  cancelled: "Отменён",
  expired: "Бронь истекла",
  refunded: "Возврат",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  processing: "Обрабатывается",
  success: "Оплачен",
  failed: "Не прошёл",
  cancelled: "Отменён",
  refund_pending: "Возврат запрошен",
  refunded: "Возвращён",
};

export const CHECKIN_RESULT_LABEL: Record<string, string> = {
  ok: "Вход разрешён",
  already_used: "Уже использован",
  not_found: "Не найден",
  not_confirmed: "Не оплачен",
  wrong_event: "Другое мероприятие",
  cancelled: "Билет отменён",
  expired: "Срок истёк",
  not_started: "Вход ещё не открыт",
};

export const WEBHOOK_STATUS_LABEL: Record<string, string> = {
  received: "Получено",
  processed: "Обработано",
  ignored: "Пропущено",
  rejected: "Отклонено",
  error: "Сбой",
};

/** Plain words for the reasons the pipeline records, so staff are not left decoding codes. */
export const NOTE_LABEL: Record<string, string> = {
  duplicate_payment: "Повторная оплата одного заказа: нужен возврат",
  seats_lost: "Деньги пришли после окончания брони, места уже заняты: нужен возврат",
  booking_cancelled: "Деньги пришли за отменённый заказ: нужен возврат",
  booking_refunded: "Деньги пришли за уже возвращённый заказ: нужен возврат",
  settled_after_hold_expired: "Оплата пришла после окончания брони, места удалось вернуть",
  refunded_manually_by_staff: "Возврат отмечен сотрудником вручную",
};
