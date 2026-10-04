import { getOrderSnapshot } from "@/lib/payments/orderStatus";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * The real status of an order, for the pages a buyer lands on after paying. The token is the
 * booking's secret access token, the same one the buyer's own ticket page uses.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Generous enough for a page that checks every few seconds, tight enough to stop token guessing.
  if (!rateLimit(`order-status:${clientIp(request)}`, 90, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const snapshot = await getOrderSnapshot(token);
  if (!snapshot) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
