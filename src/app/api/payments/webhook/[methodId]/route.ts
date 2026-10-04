import { handleWebhook } from "@/lib/payments/pipeline";
import { getProvider } from "@/lib/payments/registry";
import { createSupabaseStore } from "@/lib/payments/store";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/** Where a bank sends its payment notifications. The id in the URL is a payment method id. */
export async function POST(request: Request, { params }: { params: Promise<{ methodId: string }> }) {
  const { methodId } = await params;

  if (!rateLimit(`webhook:${methodId}:${clientIp(request)}`, 120, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let store;
  try {
    store = createSupabaseStore();
  } catch {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }

  return handleWebhook({ store, getProvider }, methodId, request);
}
