import { isMockEnabled } from "@/lib/payments/dev";
import { MOCK_SIGNATURE_HEADER, signMockBody } from "@/lib/payments/mock";
import { handleWebhook } from "@/lib/payments/pipeline";
import { getProvider } from "@/lib/payments/registry";
import { createSupabaseStore } from "@/lib/payments/store";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DEVELOPMENT ONLY. Plays the part of the bank for a payment made with the mock provider.
 *
 * Every scenario goes through the real webhook pipeline with a really signed message, so what is
 * tested here is the code that would run for a real bank. Answers 404 outside development: the
 * mock cannot be reached on the live site.
 */
export const SCENARIOS = [
  "success",
  "failed",
  "cancelled",
  "processing",
  "duplicate",
  "wrong_amount",
  "wrong_currency",
  "invalid_signature",
  "stale_timestamp",
  "unknown_payment",
  "lost_webhook",
  "refund",
] as const;
type Scenario = (typeof SCENARIOS)[number];

export async function POST(request: Request) {
  if (!isMockEnabled()) return new Response("Not found", { status: 404 });

  let input: { paymentId?: unknown; scenario?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const scenario = input.scenario as Scenario;
  if (typeof input.paymentId !== "string" || !SCENARIOS.includes(scenario)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "payments_not_configured" }, { status: 503 });

  const { data: payment } = await admin.from("payments").select("*").eq("id", input.paymentId).maybeSingle();
  if (!payment || payment.provider_code !== "mock") return Response.json({ error: "not_found" }, { status: 404 });

  const { data: keys } = await admin
    .from("organization_payment_secrets")
    .select("secret_key")
    .eq("organization_payment_method_id", payment.payment_method_id)
    .maybeSingle();
  if (!keys?.secret_key) return Response.json({ error: "keys_not_set" }, { status: 409 });
  const secret = String(keys.secret_key);

  // "The bank took the money but its message never reached us": only the bank's own record changes.
  if (scenario === "lost_webhook") {
    const metadata = { ...((payment.metadata as Record<string, unknown>) ?? {}), mock_status: "success" };
    await admin.from("payments").update({ metadata }).eq("id", payment.id);
    return Response.json({ steps: [{ note: "bank_state_set_to_success_no_notification_sent" }] });
  }

  const amount = Number(payment.amount);
  const base = {
    payment_id: String(payment.provider_payment_id),
    amount,
    currency: String(payment.currency),
    transaction_id: `mock_txn_${String(payment.id).slice(0, 8)}`,
  };
  const make = (type: string, extra: Record<string, unknown> = {}) => ({
    event_id: `evt_${crypto.randomUUID()}`,
    type,
    timestamp: Date.now(),
    ...base,
    ...extra,
  });

  type Plan = { body: Record<string, unknown>; signWith?: string };
  const plans: Plan[] = (() => {
    switch (scenario) {
      case "success":
        return [{ body: make("payment.succeeded") }];
      case "failed":
        return [{ body: make("payment.failed") }];
      case "cancelled":
        return [{ body: make("payment.cancelled") }];
      case "processing":
        return [{ body: make("payment.processing") }];
      case "refund":
        return [{ body: make("payment.refunded") }];
      case "duplicate": {
        const same = make("payment.succeeded");
        return [{ body: same }, { body: same }, { body: same }];
      }
      case "wrong_amount":
        return [{ body: make("payment.succeeded", { amount: Math.max(1, amount - 1) }) }];
      case "wrong_currency":
        return [{ body: make("payment.succeeded", { currency: "USD" }) }];
      case "invalid_signature":
        return [{ body: make("payment.succeeded"), signWith: "not-the-shared-secret" }];
      case "stale_timestamp":
        return [{ body: make("payment.succeeded", { timestamp: Date.now() - 30 * 60 * 1000 }) }];
      case "unknown_payment":
        return [{ body: make("payment.succeeded", { payment_id: "mock_does_not_exist" }) }];
      default:
        return [];
    }
  })();

  const store = createSupabaseStore();
  const steps: { status: number; body: unknown }[] = [];
  for (const plan of plans) {
    const raw = JSON.stringify(plan.body);
    const webhook = new Request("http://localhost/internal", {
      method: "POST",
      body: raw,
      headers: { [MOCK_SIGNATURE_HEADER]: signMockBody(plan.signWith ?? secret, raw) },
    });
    const res = await handleWebhook({ store, getProvider }, String(payment.payment_method_id), webhook);
    steps.push({ status: res.status, body: await res.json().catch(() => null) });
  }

  return Response.json({ steps });
}
