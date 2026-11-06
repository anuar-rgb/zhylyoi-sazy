import { createHash } from "node:crypto";
import type { PaymentRow, PaymentStore } from "./store";
import type { ObservedPayment, PaymentProvider } from "./types";

/**
 * Everything that happens between "a provider says something about a payment" and our database.
 * Provider-neutral: the provider supplies verification and the reply format, the store supplies
 * persistence, and this file decides what the news means.
 *
 * The rule it enforces: a payment becomes SUCCESS, and an order PAID, only here, only after the
 * provider's own proof (a verified notification or a direct status answer), and only through the
 * store's atomic settle(). A buyer's browser, a return URL and a success page are never consulted.
 */
export type PipelineDeps = {
  store: PaymentStore;
  getProvider: (code: string) => PaymentProvider | null;
};

export const MAX_BODY_BYTES = 100_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type Applied = {
  /** What to tell the provider: false makes a well-behaved provider try again or raise an alarm. */
  ok: boolean;
  journal: "processed" | "ignored" | "rejected";
  /** A reason worth keeping in the journal and showing to staff. */
  note: string | null;
};

/** Outcomes of settle() where the money arrived but the order could not take it: staff must refund. */
const NEEDS_REFUND = new Set(["duplicate_payment", "paid_booking_closed", "paid_seats_lost"]);

/**
 * Applies what the provider reported about one of our payments.
 * Idempotent: the same news twice leaves the same state and the same answer.
 */
export async function applyObserved(
  deps: PipelineDeps,
  payment: PaymentRow,
  observed: ObservedPayment
): Promise<Applied> {
  const { store } = deps;

  switch (observed.status) {
    case "success": {
      // A success that does not say how much, or in what currency, proves nothing.
      if (observed.amount === null || !observed.currency) {
        return { ok: false, journal: "rejected", note: "missing_amount_or_currency" };
      }
      const { outcome } = await store.settle(payment.id, observed.amount, observed.currency, observed.transactionId);

      if (outcome === "settled" || outcome === "settled_late") {
        return { ok: true, journal: "processed", note: outcome === "settled_late" ? outcome : null };
      }
      if (outcome === "already_settled") return { ok: true, journal: "processed", note: null };
      if (NEEDS_REFUND.has(outcome)) {
        // The bank took the money, so it must hear "received". The money goes straight back; if it
        // cannot, the payment stays flagged in the admin for staff to refund.
        await refundPayment(deps, { ...payment, transactionId: observed.transactionId, note: outcome });
        return { ok: true, journal: "processed", note: outcome };
      }
      if (outcome === "already_refunded") return { ok: true, journal: "ignored", note: outcome };
      // amount_mismatch, currency_mismatch, unknown_payment: nothing was confirmed.
      return { ok: false, journal: "rejected", note: outcome };
    }

    case "failed":
    case "cancelled": {
      const moved = await store.updatePaymentStatus(
        payment.id,
        { status: observed.status, failureReason: observed.eventType, transactionId: observed.transactionId },
        ["pending", "processing"]
      );
      return { ok: true, journal: moved ? "processed" : "ignored", note: moved ? null : "payment_already_final" };
    }

    case "pending":
      // Nothing has happened yet; there is nothing to record.
      return { ok: true, journal: "ignored", note: "still_pending" };

    case "processing": {
      const moved = await store.updatePaymentStatus(payment.id, { status: "processing" }, ["pending"]);
      return { ok: true, journal: moved ? "processed" : "ignored", note: null };
    }

    case "refunded": {
      const outcome = await store.applyRefund(payment.id);
      if (outcome === "refunded" || outcome === "already_refunded") return { ok: true, journal: "processed", note: null };
      return { ok: false, journal: "rejected", note: outcome };
    }
  }
}

/**
 * Returns a settled payment's money through the provider, and records it only once the provider
 * agreed. A second payment for an order that stands refunds that payment alone; anything else
 * closes the order with it.
 */
export async function refundPayment(
  deps: PipelineDeps,
  payment: PaymentRow
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const provider = deps.getProvider(payment.providerCode);
  const secrets = payment.paymentMethodId ? await deps.store.getSecrets(payment.paymentMethodId) : null;
  if (!provider || !secrets || !payment.providerPaymentId) return { ok: false, reason: "provider_or_keys_missing" };

  const result = await provider.refundPayment({
    paymentId: payment.id,
    providerPaymentId: payment.providerPaymentId,
    transactionId: payment.transactionId ?? null,
    amount: payment.amount,
    currency: payment.currency,
    secrets,
  });
  if (!result.ok) return { ok: false, reason: result.reason };

  if (payment.note === "duplicate_payment") {
    await deps.store.closeRefundedPayment(payment.id);
    return { ok: true };
  }
  const outcome = await deps.store.applyRefund(payment.id);
  return outcome === "refunded" || outcome === "already_refunded" ? { ok: true } : { ok: false, reason: outcome };
}

/**
 * Asks the provider about one booking's unanswered payments, for a buyer waiting on the page: a
 * bank's notification can be late or lost. Any failure just leaves things as they were.
 */
export async function syncBookingPayments(deps: PipelineDeps, bookingId: string): Promise<void> {
  for (const payment of await deps.store.listOpenPayments(bookingId)) {
    try {
      const provider = deps.getProvider(payment.providerCode);
      const secrets = payment.paymentMethodId ? await deps.store.getSecrets(payment.paymentMethodId) : null;
      if (!provider || !secrets || !payment.providerPaymentId) continue;
      const answer = await provider.getPaymentStatus({ providerPaymentId: payment.providerPaymentId, metadata: payment.metadata, secrets });
      if (answer.ok) await applyObserved(deps, payment, answer.observed);
    } catch {
      // the next look, or reconciliation, tries again
    }
  }
}

/** The endpoint behind /api/payments/webhook/[methodId]. */
export async function handleWebhook(deps: PipelineDeps, methodId: string, request: Request): Promise<Response> {
  if (!UUID.test(methodId)) return json(404, { error: "not_found" });
  const { store } = deps;

  const method = await store.findMethod(methodId);
  if (!method || !method.isEnabled) return json(404, { error: "not_found" });

  const provider = deps.getProvider(method.providerCode);
  if (!provider) return json(501, { error: "integration_not_available" });

  const secrets = await store.getSecrets(method.id);
  if (!secrets) return json(409, { error: "keys_not_set" });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json(413, { error: "too_large" });
  const payloadHash = sha256(rawBody);

  const verified = await provider.verifyWebhook({ headers: request.headers, rawBody, secrets });
  if (!verified.ok) {
    await store.logWebhook({
      providerCode: method.providerCode,
      paymentMethodId: method.id,
      organizationId: method.organizationId,
      eventId: null,
      paymentId: null,
      eventType: null,
      payloadHash,
      status: "rejected",
      error: verified.reason,
    });
    return json(verified.status, { error: verified.reason });
  }

  const observed = verified.observed;
  const logId = await store.logWebhook({
    providerCode: method.providerCode,
    paymentMethodId: method.id,
    organizationId: method.organizationId,
    eventId: observed.eventId,
    paymentId: observed.providerPaymentId,
    eventType: observed.eventType,
    payloadHash,
    status: "received",
  });

  try {
    const payment = await store.findPaymentByProviderId(
      method.organizationId,
      method.providerCode,
      observed.providerPaymentId
    );
    if (!payment) {
      await store.finishWebhook(logId, "rejected", "unknown_payment");
      return provider.acknowledge({ ok: false, reason: "unknown_payment" });
    }

    const applied = await applyObserved(deps, payment, observed);
    await store.finishWebhook(logId, applied.journal, applied.note);
    return provider.acknowledge({ ok: applied.ok, reason: applied.note ?? undefined });
  } catch (error) {
    // A database failure is not the bank's fault and not a verdict on the payment: answer with a
    // server error so the bank retries, and keep the reason for staff.
    await store.finishWebhook(logId, "error", error instanceof Error ? error.message.slice(0, 200) : "error");
    return json(500, { error: "temporarily_unavailable" });
  }
}

const ABANDONED_AFTER_MS = 60 * 60 * 1000;

export type ReconcileSummary = {
  checked: number;
  settled: number;
  closed: number;
  unchanged: number;
  problems: number;
};

/**
 * Asks the provider about payments that have been waiting too long for a notification.
 * A provider that cannot be reached leaves the payment exactly as it was and records why.
 */
export async function reconcile(
  deps: PipelineDeps,
  options: { olderThanMs?: number; limit?: number; now?: () => Date } = {}
): Promise<ReconcileSummary> {
  const { store } = deps;
  const now = options.now?.() ?? new Date();
  const olderThan = new Date(now.getTime() - (options.olderThanMs ?? 5 * 60 * 1000));
  const payments = await store.listStalePayments(olderThan, options.limit ?? 50);

  const summary: ReconcileSummary = { checked: 0, settled: 0, closed: 0, unchanged: 0, problems: 0 };

  for (const payment of payments) {
    summary.checked++;
    try {
      const provider = deps.getProvider(payment.providerCode);
      const secrets = payment.paymentMethodId ? await store.getSecrets(payment.paymentMethodId) : null;
      if (!provider || !secrets || !payment.providerPaymentId) {
        summary.problems++;
        await store.noteReconcileProblem(payment.id, "provider_or_keys_missing");
        continue;
      }

      const answer = await provider.getPaymentStatus({
        providerPaymentId: payment.providerPaymentId,
        metadata: payment.metadata,
        secrets,
      });
      if (!answer.ok) {
        summary.problems++;
        await store.noteReconcileProblem(payment.id, `status_unavailable:${answer.reason}`);
        continue;
      }

      // Nobody paid and the form has long closed: stop asking, or such rows crowd out the live ones.
      const abandoned =
        answer.observed.status === "pending" &&
        payment.createdAt !== undefined &&
        now.getTime() - new Date(payment.createdAt).getTime() > ABANDONED_AFTER_MS;
      if (abandoned) {
        await store.updatePaymentStatus(payment.id, { status: "cancelled", failureReason: "abandoned" }, ["pending", "processing"]);
        summary.closed++;
        continue;
      }

      const applied = await applyObserved(deps, payment, answer.observed);
      if (!applied.ok) {
        summary.problems++;
        await store.noteReconcileProblem(payment.id, applied.note ?? "rejected");
      } else if (answer.observed.status === "success") summary.settled++;
      else if (answer.observed.status === "failed" || answer.observed.status === "cancelled") summary.closed++;
      else summary.unchanged++;
    } catch (error) {
      summary.problems++;
      await store.noteReconcileProblem(payment.id, error instanceof Error ? error.message : "error");
    }
  }

  return summary;
}
