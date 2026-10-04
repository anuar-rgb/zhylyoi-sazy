import { createPaymentForBooking } from "@/lib/payments/create";
import { publicOrigin } from "@/lib/origin";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const STATUS = {
  not_found: 404,
  not_payable: 409,
  method_unavailable: 409,
  provider_unavailable: 502,
  failed: 500,
} as const;

/**
 * Starts a payment for the buyer's own booking (found by its secret access token) with one of the
 * institution's bank methods. Returns where to send the buyer; says nothing else about the payment.
 */
export async function POST(request: Request) {
  if (!rateLimit(`pay-create:${clientIp(request)}`, 10, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { accessToken?: unknown; methodId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if (typeof body.accessToken !== "string" || typeof body.methodId !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await createPaymentForBooking({
    accessToken: body.accessToken,
    methodId: body.methodId,
    origin: publicOrigin(request),
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: STATUS[result.error] });
  return Response.json({ redirectUrl: result.redirectUrl });
}
