import { createAdminClient } from "@/lib/supabase/admin";
import { orderStatusOf, type OrderStatus } from "@/lib/payments/orderStatus";
import { INSTITUTION_TIME_ZONE } from "@/lib/timeZone";

/**
 * What the "Мои билеты" list on the Билеты page may show about a booking: only what the buyer's
 * own booking page already shows, found only by the booking's secret token.
 */
export type TicketSummary = {
  token: string;
  orderNumber: string;
  status: OrderStatus;
  titleKk: string | null;
  titleRu: string | null;
  eventDate: string | null;
  /** "4 қазан, 21:00" / "4 октября, 21:00", worded on the server like the event cards. */
  whenKk: string;
  whenRu: string;
  /** The event has already begun; decided here so the browser's clock does not matter. */
  started: boolean;
  tickets: number;
  amount: number;
  currency: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_LOOKUP = 30;

type Row = Record<string, unknown>;

const ZONE = INSTITUTION_TIME_ZONE;

function wording(iso: string | null, tag: "kk-KZ" | "ru-RU"): string {
  if (!iso) return "";
  const at = new Date(iso);
  const day = at.toLocaleDateString(tag, { day: "numeric", month: "long", timeZone: ZONE });
  const time = at.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONE });
  return `${day}, ${time}`;
}

export async function getTicketSummaries(tokens: string[], now = new Date()): Promise<TicketSummary[]> {
  const valid = [...new Set(tokens.filter((t) => UUID.test(t)).map((t) => t.toLowerCase()))].slice(0, MAX_LOOKUP);
  if (valid.length === 0) return [];

  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("bookings")
    .select(
      "access_token, public_order_id, status, total_amount, currency, " +
        "culture_events(title_kk, title_ru, event_date), booking_items(released_at)"
    )
    .in("access_token", valid);
  if (error || !data) return [];

  return (data as unknown as Row[]).map((row) => {
    const event = (Array.isArray(row.culture_events) ? row.culture_events[0] : row.culture_events) as Row | null;
    const items = (row.booking_items as Row[] | null) ?? [];
    const amount = Number(row.total_amount) || 0;
    const status = orderStatusOf(String(row.status), amount);
    const live = status === "PENDING" || status === "PAID" || status === "FREE";
    const eventDate = event && typeof event.event_date === "string" ? event.event_date : null;

    return {
      token: String(row.access_token),
      orderNumber: String(row.public_order_id),
      status,
      titleKk: event && typeof event.title_kk === "string" ? event.title_kk : null,
      titleRu: event && typeof event.title_ru === "string" ? event.title_ru : null,
      eventDate,
      whenKk: wording(eventDate, "kk-KZ"),
      whenRu: wording(eventDate, "ru-RU"),
      started: eventDate ? new Date(eventDate).getTime() < now.getTime() : false,
      tickets: live ? items.filter((item) => item.released_at === null).length : items.length,
      amount,
      currency: String(row.currency ?? "KZT"),
    };
  });
}
