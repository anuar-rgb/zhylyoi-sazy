import { timingSafeEqual } from "node:crypto";
import { reconcile } from "@/lib/payments/pipeline";
import { getProvider } from "@/lib/payments/registry";
import { createSupabaseStore } from "@/lib/payments/store";

/**
 * Asks the providers about payments that have waited too long for a notification.
 *
 * Meant to be called on a schedule (see docs/payments.md), not by people and never by a browser
 * page: it requires the secret in CRON_SECRET. Without that variable it refuses everything.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not_configured" }, { status: 503 });

  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let store;
  try {
    store = createSupabaseStore();
  } catch {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }

  const summary = await reconcile({ store, getProvider });
  return Response.json(summary);
}

export const GET = run;
export const POST = run;
