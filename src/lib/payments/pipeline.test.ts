import { afterEach, describe, expect, it, vi } from "vitest";
import { handleWebhook, reconcile, sha256, MAX_BODY_BYTES, type PipelineDeps } from "./pipeline";
import { MOCK_SIGNATURE_HEADER, mockProvider, signMockBody } from "./mock";
import { getProvider } from "./registry";
import type { MethodRow, PaymentRow, PaymentStore, WebhookLogEntry } from "./store";
import type { PaymentProvider, PaymentSecrets } from "./types";

const METHOD_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const PAYMENT_ID = "33333333-3333-4333-8333-333333333333";
const BOOKING_ID = "44444444-4444-4444-8444-444444444444";
const PROVIDER_PAYMENT_ID = "mock_abc";
const SECRET = "test-secret";

/**
 * An in-memory stand-in for the database. settle() mirrors the rules of the SQL function
 * settle_payment closely enough to test the pipeline's routing; the SQL itself is exercised against
 * the real database (see docs/payments.md), not here.
 */
class MemoryStore implements PaymentStore {
  methods = new Map<string, MethodRow>();
  secrets = new Map<string, PaymentSecrets>();
  payments = new Map<string, PaymentRow>();
  bookings = new Map<string, { status: string }>();
  webhooks: { entry: WebhookLogEntry; final?: string; error?: string | null }[] = [];
  confirmations = 0;
  refunds = 0;
  problems = new Map<string, string>();
  failNextSettle = false;

  async findMethod(id: string) {
    return this.methods.get(id) ?? null;
  }
  async getSecrets(methodId: string) {
    return this.secrets.get(methodId) ?? null;
  }
  async logWebhook(entry: WebhookLogEntry) {
    this.webhooks.push({ entry });
    return String(this.webhooks.length - 1);
  }
  async finishWebhook(id: string | null, status: string, error?: string | null) {
    if (id === null) return;
    const row = this.webhooks[Number(id)];
    row.final = status;
    row.error = error ?? null;
  }
  async findPaymentByProviderId(_org: string, _provider: string, providerPaymentId: string) {
    return [...this.payments.values()].find((p) => p.providerPaymentId === providerPaymentId) ?? null;
  }
  async settle(paymentId: string, amount: number, currency: string) {
    if (this.failNextSettle) throw new Error("database is down");
    const payment = this.payments.get(paymentId);
    if (!payment) return { outcome: "unknown_payment", bookingId: null };
    if (payment.status === "success") return { outcome: "already_settled", bookingId: payment.bookingId };
    if (payment.status === "refunded") return { outcome: "already_refunded", bookingId: payment.bookingId };
    if (payment.amount !== amount) return { outcome: "amount_mismatch", bookingId: payment.bookingId };
    if (payment.currency.toUpperCase() !== currency.toUpperCase()) {
      return { outcome: "currency_mismatch", bookingId: payment.bookingId };
    }
    payment.status = "success";
    const booking = this.bookings.get(payment.bookingId)!;
    if (booking.status !== "confirmed") {
      booking.status = "confirmed";
      this.confirmations++;
    }
    return { outcome: "settled", bookingId: payment.bookingId };
  }
  async updatePaymentStatus(paymentId: string, patch: { status: string }, onlyFrom: string[]) {
    const payment = this.payments.get(paymentId);
    if (!payment || !onlyFrom.includes(payment.status)) return false;
    payment.status = patch.status;
    return true;
  }
  async applyRefund(paymentId: string) {
    const payment = this.payments.get(paymentId);
    if (!payment) return "unknown_payment";
    payment.status = "refunded";
    this.bookings.get(payment.bookingId)!.status = "refunded";
    this.refunds++;
    return "refunded";
  }
  async listStalePayments() {
    return [...this.payments.values()].filter((p) => p.status === "pending" || p.status === "processing");
  }
  async noteReconcileProblem(paymentId: string, problem: string) {
    this.problems.set(paymentId, problem);
  }
}

function setup(overrides: Partial<PaymentRow> = {}) {
  const store = new MemoryStore();
  store.methods.set(METHOD_ID, { id: METHOD_ID, organizationId: ORG_ID, providerCode: "mock", isEnabled: true });
  store.secrets.set(METHOD_ID, { merchantId: "m", secretKey: SECRET });
  store.bookings.set(BOOKING_ID, { status: "pending" });
  store.payments.set(PAYMENT_ID, {
    id: PAYMENT_ID,
    organizationId: ORG_ID,
    bookingId: BOOKING_ID,
    paymentMethodId: METHOD_ID,
    providerCode: "mock",
    providerPaymentId: PROVIDER_PAYMENT_ID,
    amount: 1500,
    currency: "KZT",
    status: "pending",
    metadata: { mock_status: "pending", mock_amount: 1500, mock_currency: "KZT" },
    ...overrides,
  });
  const deps: PipelineDeps = { store, getProvider: (code) => (code === "mock" ? mockProvider : null) };
  return { store, deps };
}

type Body = Record<string, unknown>;

function notification(type: string, extra: Body = {}): Body {
  return {
    event_id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    payment_id: PROVIDER_PAYMENT_ID,
    amount: 1500,
    currency: "KZT",
    transaction_id: "txn_1",
    timestamp: Date.now(),
    ...extra,
  };
}

function signedRequest(body: Body, secret = SECRET, headers: Record<string, string> = {}): Request {
  const raw = JSON.stringify(body);
  return new Request("http://localhost/api/payments/webhook/x", {
    method: "POST",
    body: raw,
    headers: { [MOCK_SIGNATURE_HEADER]: signMockBody(secret, raw), ...headers },
  });
}

async function send(deps: PipelineDeps, body: Body, secret = SECRET) {
  return handleWebhook(deps, METHOD_ID, signedRequest(body, secret));
}

afterEach(() => vi.unstubAllEnvs());

describe("webhook: successful payment", () => {
  it("settles the payment, confirms the order once and journals it", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded"));

    expect(res.status).toBe(200);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("success");
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("confirmed");
    expect(store.confirmations).toBe(1);
    expect(store.webhooks.at(-1)!.final).toBe("processed");
  });

  it("is idempotent: three identical deliveries confirm the order once", async () => {
    const { store, deps } = setup();
    const body = notification("payment.succeeded");
    const results = [await send(deps, body), await send(deps, body), await send(deps, body)];

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(store.confirmations).toBe(1);
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("confirmed");
  });

  it("settles a payment that was marked failed when the money turns out to have arrived", async () => {
    const { store, deps } = setup({ status: "failed" });
    const res = await send(deps, notification("payment.succeeded"));
    expect(res.status).toBe(200);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("success");
  });
});

describe("webhook: refusing what cannot be trusted", () => {
  it("rejects an invalid signature and changes nothing", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded"), "wrong-secret");

    expect(res.status).toBe(401);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("pending");
    expect(store.webhooks.at(-1)!.entry.status).toBe("rejected");
    expect(store.webhooks.at(-1)!.entry.error).toBe("invalid_signature");
  });

  it("rejects a request with no signature", async () => {
    const { store, deps } = setup();
    const req = new Request("http://localhost/x", { method: "POST", body: JSON.stringify(notification("payment.succeeded")) });
    const res = await handleWebhook(deps, METHOD_ID, req);
    expect(res.status).toBe(401);
    expect(store.confirmations).toBe(0);
  });

  it("rejects a correctly signed but old message (replay)", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded", { timestamp: Date.now() - 10 * 60 * 1000 }));
    expect(res.status).toBe(401);
    expect(store.confirmations).toBe(0);
  });

  it("does not confirm when the amount differs", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded", { amount: 100 }));

    expect(res.status).toBe(422);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("pending");
    expect(store.webhooks.at(-1)!.final).toBe("rejected");
  });

  it("does not confirm when the currency differs", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded", { currency: "USD" }));
    expect(res.status).toBe(422);
    expect(store.confirmations).toBe(0);
  });

  it("does not confirm a success that carries no amount", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded", { amount: undefined }));
    expect(res.status).toBe(422);
    expect(store.confirmations).toBe(0);
  });

  it("answers an unknown payment with a refusal and journals it", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.succeeded", { payment_id: "mock_unknown" }));
    expect(res.status).toBe(422);
    expect(store.confirmations).toBe(0);
    expect(store.webhooks.at(-1)!.final).toBe("rejected");
  });
});

describe("webhook: other outcomes", () => {
  it("marks a failed payment failed and leaves the order unpaid", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.failed"));
    expect(res.status).toBe(200);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("failed");
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("pending");
  });

  it("marks a cancelled payment cancelled", async () => {
    const { store, deps } = setup();
    await send(deps, notification("payment.cancelled"));
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("cancelled");
  });

  it("leaves a payment alone when the provider says it is still pending", async () => {
    const { store, deps } = setup();
    const res = await send(deps, notification("payment.pending"));
    expect(res.status).toBe(200);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
  });

  it("moves a pending payment to processing, and does not undo a settled one", async () => {
    const { store, deps } = setup();
    await send(deps, notification("payment.processing"));
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("processing");

    await send(deps, notification("payment.succeeded"));
    await send(deps, notification("payment.failed"));
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("success");
  });

  it("applies a refund only when the provider reports one", async () => {
    const { store, deps } = setup();
    await send(deps, notification("payment.succeeded"));
    await send(deps, notification("payment.refunded"));
    expect(store.refunds).toBe(1);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("refunded");
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("refunded");
  });

  it("answers a server error, not a verdict, when the database fails", async () => {
    const { store, deps } = setup();
    store.failNextSettle = true;
    const res = await send(deps, notification("payment.succeeded"));
    expect(res.status).toBe(500);
    expect(store.webhooks.at(-1)!.final).toBe("error");
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
  });
});

describe("webhook: addressing", () => {
  it("404 for an id that is not a uuid", async () => {
    const { deps } = setup();
    expect((await handleWebhook(deps, "not-a-uuid", signedRequest(notification("payment.succeeded")))).status).toBe(404);
  });

  it("404 for an unknown or disabled method", async () => {
    const { store, deps } = setup();
    expect((await handleWebhook(deps, "99999999-9999-4999-8999-999999999999", signedRequest({}))).status).toBe(404);
    store.methods.get(METHOD_ID)!.isEnabled = false;
    expect((await send(deps, notification("payment.succeeded"))).status).toBe(404);
  });

  it("501 when there is no integration for the provider", async () => {
    const { store, deps } = setup();
    store.methods.get(METHOD_ID)!.providerCode = "some_bank";
    expect((await send(deps, notification("payment.succeeded"))).status).toBe(501);
  });

  it("409 when the keys are not set", async () => {
    const { store, deps } = setup();
    store.secrets.delete(METHOD_ID);
    expect((await send(deps, notification("payment.succeeded"))).status).toBe(409);
  });

  it("413 for an oversized body", async () => {
    const { deps } = setup();
    const req = new Request("http://localhost/x", { method: "POST", body: "x".repeat(MAX_BODY_BYTES + 1) });
    expect((await handleWebhook(deps, METHOD_ID, req)).status).toBe(413);
  });

  it("keeps a fingerprint of the body in the journal, not the body", async () => {
    const { store, deps } = setup();
    const body = notification("payment.succeeded");
    await send(deps, body);
    expect(store.webhooks.at(-1)!.entry.payloadHash).toBe(sha256(JSON.stringify(body)));
  });
});

describe("reconciliation", () => {
  function providerSaying(status: string, amount: number | null = 1500): PaymentProvider {
    return {
      ...mockProvider,
      async getPaymentStatus() {
        return {
          ok: true,
          observed: {
            providerPaymentId: PROVIDER_PAYMENT_ID,
            status: status as never,
            amount,
            currency: "KZT",
            transactionId: "txn_r",
            eventId: null,
            eventType: "status_poll",
          },
        };
      },
    };
  }

  it("settles a waiting payment the provider reports as paid", async () => {
    const { store, deps } = setup();
    const summary = await reconcile({ ...deps, getProvider: () => providerSaying("success") });
    expect(summary).toMatchObject({ checked: 1, settled: 1, problems: 0 });
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("confirmed");
  });

  it("closes a payment the provider reports as failed", async () => {
    const { store, deps } = setup();
    const summary = await reconcile({ ...deps, getProvider: () => providerSaying("failed") });
    expect(summary.closed).toBe(1);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("failed");
  });

  it("leaves a payment the provider still shows as pending", async () => {
    const { store, deps } = setup();
    const summary = await reconcile({ ...deps, getProvider: () => providerSaying("pending") });
    expect(summary.unchanged).toBe(1);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
  });

  it("never reads an outage as a failed payment", async () => {
    const { store, deps } = setup();
    const down: PaymentProvider = { ...mockProvider, getPaymentStatus: async () => ({ ok: false, reason: "timeout" }) };
    const summary = await reconcile({ ...deps, getProvider: () => down });

    expect(summary.problems).toBe(1);
    expect(store.payments.get(PAYMENT_ID)!.status).toBe("pending");
    expect(store.problems.get(PAYMENT_ID)).toContain("timeout");
  });

  it("does not confirm a reported success whose amount differs", async () => {
    const { store, deps } = setup();
    const summary = await reconcile({ ...deps, getProvider: () => providerSaying("success", 10) });
    expect(summary.problems).toBe(1);
    expect(store.bookings.get(BOOKING_ID)!.status).toBe("pending");
  });
});

describe("the mock provider", () => {
  it("exists in development and tests", () => {
    expect(getProvider("mock")).not.toBeNull();
  });

  it("does not exist in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getProvider("mock")).toBeNull();
  });

  it("is not reachable through the webhook in production", async () => {
    const { deps } = setup();
    vi.stubEnv("NODE_ENV", "production");
    const prodDeps: PipelineDeps = { ...deps, getProvider };
    expect((await handleWebhook(prodDeps, METHOD_ID, signedRequest(notification("payment.succeeded")))).status).toBe(501);
  });
});
