import { MAX_LOOKUP, getTicketSummaries } from "@/lib/ticketing/myTickets";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * The status of the bookings a browser remembers (see src/lib/myTickets.ts). Each booking is found
 * only by its secret token and only what the buyer's own booking page shows comes back. A token
 * with no booking is simply absent from the answer, which is how the browser learns a booking is
 * gone (for example its event was deleted).
 */
export async function POST(request: Request) {
  if (!rateLimit(`my-tickets:${clientIp(request)}`, 60, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { tokens?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!Array.isArray(body.tokens) || body.tokens.length > MAX_LOOKUP * 2) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const tokens = body.tokens.filter((t): t is string => typeof t === "string");
  const tickets = await getTicketSummaries(tokens);
  return Response.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
}
