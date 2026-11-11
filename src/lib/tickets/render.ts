import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketsPdf, type TicketPdfLabels } from "@/lib/tickets/pdf";
import { loadTicketFonts } from "@/lib/tickets/fonts";
import { INSTITUTION_TIME_ZONE } from "@/lib/timeZone";
import { PARTER, sectionLabel, toSection } from "@/lib/hallSections";

const ZONE = INSTITUTION_TIME_ZONE;

const LABELS: Record<"ru" | "kk", TicketPdfLabels> = {
  ru: {
    ticket: "Билет",
    rowSeat: (row, seat) => `Ряд ${row}, место ${seat}`,
    order: "Заказ",
    buyer: "Покупатель",
    free: "бесплатно",
    hint: "Предъявите QR-код на входе. Билет действует один раз.",
    code: "Код:",
  },
  kk: {
    ticket: "Билет",
    rowSeat: (row, seat) => `${row} қатар, ${seat} орын`,
    order: "Тапсырыс",
    buyer: "Сатып алушы",
    free: "тегін",
    hint: "Кіреберісте QR-кодты көрсетіңіз. Билет бір рет қана жарамды.",
    code: "Код:",
  },
};

type Row = Record<string, unknown>;
const one = (value: unknown): Row | null => ((Array.isArray(value) ? value[0] : value) as Row | null) ?? null;
const text = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

export type RenderedTickets = {
  pdf: Uint8Array;
  orderNumber: string;
  eventTitle: string;
  when: string;
  place: string | null;
  organization: string;
  tickets: number;
};

/**
 * The tickets of one confirmed booking as a PDF, one page per seat still held. Read with the
 * server's key, so the caller decides who may have them: the download link by the booking's secret
 * token, the email by the address the buyer gave. Null when there is nothing to hand out.
 */
export async function renderTicketsPdf(
  admin: SupabaseClient,
  where: { token: string } | { bookingId: string },
  lang: "ru" | "kk"
): Promise<RenderedTickets | null> {
  const tag = lang === "kk" ? "kk-KZ" : "ru-RU";

  let query = admin.from("bookings").select("id, public_order_id, status, buyer_name, buyer_email, currency, event_id, organization_id");
  query = "token" in where ? query.eq("access_token", where.token) : query.eq("id", where.bookingId);
  const { data: booking } = await query.maybeSingle();
  if (!booking || booking.status !== "confirmed") return null;

  const readItems = (seatColumns: string) =>
    admin
      .from("booking_items")
      .select(`ticket_code, price_at_booking, hall_seats(${seatColumns}), event_ticket_types(name_kk, name_ru, category)`)
      .eq("booking_id", booking.id)
      .is("released_at", null)
      .order("created_at", { ascending: true });
  const [itemsResult, { data: event }, { data: organization }] = await Promise.all([
    readItems("row_label, seat_number, section"),
    admin.from("culture_events").select("title_kk, title_ru, event_date, location_kk, location_ru").eq("id", booking.event_id).maybeSingle(),
    admin.from("organizations").select("name, name_kk, name_ru").eq("id", booking.organization_id).maybeSingle(),
  ]);
  // A database without the sections migration has no section column; every seat is the parter then.
  const { data: items } = itemsResult.error?.code === "42703" ? await readItems("row_label, seat_number") : itemsResult;
  if (!items || items.length === 0 || !event) return null;

  const at = new Date(String(event.event_date));
  const when =
    `${at.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric", timeZone: ZONE })}, ` +
    at.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONE });

  const pick = (kk: unknown, ru: unknown) => (lang === "kk" ? (text(kk) ?? text(ru)) : (text(ru) ?? text(kk)));
  const organizationName = pick(organization?.name_kk, organization?.name_ru) ?? text(organization?.name) ?? "";
  const eventTitle = pick(event.title_kk, event.title_ru) ?? "";
  const place = pick(event.location_kk, event.location_ru);

  const pdf = await buildTicketsPdf(
    {
      organization: organizationName,
      eventTitle,
      when,
      place,
      orderNumber: String(booking.public_order_id),
      // Orders now carry an email only; earlier ones were made with a name.
      buyerName: text(booking.buyer_email) ?? text(booking.buyer_name) ?? "",
      currency: String(booking.currency ?? "KZT"),
      tickets: (items as unknown as Row[]).map((item) => {
        const seat = one(item.hall_seats);
        const type = one(item.event_ticket_types);
        return {
          code: String(item.ticket_code),
          // The parter is not named, so a hall with only the parter prints exactly as before.
          section: seat && toSection(seat.section) !== PARTER ? sectionLabel(String(seat.section), lang) : null,
          row: seat ? String(seat.row_label) : "",
          seat: seat ? Number(seat.seat_number) : 0,
          type: type ? (pick(type.name_kk, type.name_ru) ?? text(type.category)) : null,
          price: Number(item.price_at_booking) || 0,
        };
      }),
    },
    LABELS[lang],
    await loadTicketFonts()
  );

  return { pdf, orderNumber: String(booking.public_order_id), eventTitle, when, place, organization: organizationName, tickets: items.length };
}
