import { livePipeline } from "@/lib/payments/deps";
import { getOrderSnapshot } from "@/lib/payments/orderStatus";
import { syncBookingPayments } from "@/lib/payments/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // The buyer is waiting right now and the bank's message may be late or lost, so ask the bank too,
  // though not on every look of a page that checks every few seconds.
  if (rateLimit(`order-sync:${token}`, 6, 60_000) && UUID.test(token)) {
    try {
      const { data } = (await createAdminClient()?.from("bookings").select("id").eq("access_token", token).maybeSingle()) ?? { data: null };
      if (data?.id) await syncBookingPayments(livePipeline(), String(data.id));
    } catch {
      // the answer below is still the truth as we know it
    }
  }

  const snapshot = await getOrderSnapshot(token);
  if (!snapshot) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
