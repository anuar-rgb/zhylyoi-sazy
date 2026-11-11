import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { renderTicketsPdf } from "@/lib/tickets/render";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const rendered = await renderTicketsPdf(admin, { token }, lang);
  if (!rendered) return Response.json({ error: "not_found" }, { status: 404 });

  return new Response(Buffer.from(rendered.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tickets-${rendered.orderNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
