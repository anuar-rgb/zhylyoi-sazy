import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { buildTicketsPdf, type TicketPdfLabels } from "@/lib/tickets/pdf";
import { loadTicketFonts } from "@/lib/tickets/fonts";
import { INSTITUTION_TIME_ZONE } from "@/lib/timeZone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

/**
 * The buyer's tickets as a PDF, one page per seat. Found only by the booking's secret token, like
 * the booking page itself, and only for a confirmed booking: an unpaid or cancelled order has no
 * ticket to hand out.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!rateLimit(`ticket-pdf:${clientIp(request)}`, 30, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!UUID.test(token)) return Response.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "unavailable" }, { status: 503 });

  const lang = new URL(request.url).searchParams.get("lang") === "kk" ? "kk" : "ru";
  const tag = lang === "kk" ? "kk-KZ" : "ru-RU";

  const { data: booking } = await admin
    .from("bookings")
    .select("id, public_order_id, status, buyer_name, currency, event_id, organization_id")
    .eq("access_token", token)
    .maybeSingle();
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });
  if (booking.status !== "confirmed") return Response.json({ error: "not_confirmed" }, { status: 409 });

  const [{ data: items }, { data: event }, { data: organization }] = await Promise.all([
    admin
      .from("booking_items")
      .select("ticket_code, price_at_booking, hall_seats(row_label, seat_number), event_ticket_types(name_kk, name_ru, category)")
      .eq("booking_id", booking.id)
      .is("released_at", null)
      .order("created_at", { ascending: true }),
    admin.from("culture_events").select("title_kk, title_ru, event_date, location_kk, location_ru").eq("id", booking.event_id).maybeSingle(),
    admin.from("organizations").select("name, name_kk, name_ru").eq("id", booking.organization_id).maybeSingle(),
  ]);
  if (!items || items.length === 0 || !event) return Response.json({ error: "not_found" }, { status: 404 });

  const at = new Date(String(event.event_date));
  const when =
    `${at.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric", timeZone: ZONE })}, ` +
    at.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONE });

  const pick = (kk: unknown, ru: unknown) => (lang === "kk" ? (text(kk) ?? text(ru)) : (text(ru) ?? text(kk)));

  const pdf = await buildTicketsPdf(
    {
      organization: pick(organization?.name_kk, organization?.name_ru) ?? text(organization?.name) ?? "",
      eventTitle: pick(event.title_kk, event.title_ru) ?? "",
      when,
      place: pick(event.location_kk, event.location_ru),
      orderNumber: String(booking.public_order_id),
      buyerName: String(booking.buyer_name),
      currency: String(booking.currency ?? "KZT"),
      tickets: (items as unknown as Row[]).map((item) => {
        const seat = one(item.hall_seats);
        const type = one(item.event_ticket_types);
        return {
          code: String(item.ticket_code),
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

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tickets-${booking.public_order_id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
