import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  ObservedPayment,
  PaymentProvider,
  PaymentSecrets,
  PaymentStatusResult,
  ProviderPaymentStatus,
  RefundResult,
  VerifyWebhookResult,
} from "./types";

/**
 * A pretend bank for development and tests. No money, no network.
 *
 * It behaves like a real provider in the ways that matter to our code: notifications are signed
 * (HMAC-SHA256 of the raw body with the shared secret), carry a timestamp that must be fresh, and
 * can arrive twice. The mock bank page (/dev-bank/...) and the tests use it to play every scenario.
 */
export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
export const MOCK_MAX_AGE_MS = 5 * 60 * 1000;

const EVENT_STATUS: Record<string, ProviderPaymentStatus> = {
  "payment.succeeded": "success",
  "payment.failed": "failed",
  "payment.cancelled": "cancelled",
  "payment.pending": "pending",
  "payment.processing": "processing",
  "payment.refunded": "refunded",
};

export function signMockBody(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type MockNotification = {
  event_id: string;
  type: string;
  payment_id: string;
  amount?: number;
  currency?: string;
  transaction_id?: string;
  timestamp: number;
};

export const mockProvider: PaymentProvider = {
  code: "mock",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `mock_${randomUUID()}`;
    const origin = new URL(input.returnUrl).origin;
    return {
      ok: true,
      providerPaymentId,
      redirectUrl: `${origin}/dev-bank/${input.paymentId}`,
      metadata: { mock_status: "pending", mock_amount: input.amount, mock_currency: input.currency },
    };
  },

  async getPaymentStatus({ providerPaymentId, metadata }): Promise<PaymentStatusResult> {
    const status = metadata.mock_status;
    if (typeof status !== "string" || !(status in STATUS_VALUES)) return { ok: false, reason: "no_state" };
    return {
      ok: true,
      observed: {
        providerPaymentId,
        status: status as ProviderPaymentStatus,
        amount: typeof metadata.mock_amount === "number" ? metadata.mock_amount : null,
        currency: typeof metadata.mock_currency === "string" ? metadata.mock_currency : null,
        transactionId: `mock_txn_${providerPaymentId.slice(5, 13)}`,
        eventId: null,
        eventType: "status_poll",
      },
    };
  },

  async verifyWebhook({ headers, rawBody, secrets }: {
    headers: Headers;
    rawBody: string;
    secrets: PaymentSecrets;
  }): Promise<VerifyWebhookResult> {
    const received = headers.get(MOCK_SIGNATURE_HEADER);
    if (!received) return { ok: false, status: 401, reason: "missing_signature" };
    if (!signaturesMatch(signMockBody(secrets.secretKey, rawBody), received)) {
      return { ok: false, status: 401, reason: "invalid_signature" };
    }

    let body: Partial<MockNotification>;
    try {
      body = JSON.parse(rawBody) as Partial<MockNotification>;
    } catch {
      return { ok: false, status: 400, reason: "invalid_json" };
    }

    // Replay protection: a captured, correctly signed message is useless a few minutes later.
    if (typeof body.timestamp !== "number" || Math.abs(Date.now() - body.timestamp) > MOCK_MAX_AGE_MS) {
      return { ok: false, status: 401, reason: "stale_timestamp" };
    }

    const status = typeof body.type === "string" ? EVENT_STATUS[body.type] : undefined;
    if (!status || typeof body.payment_id !== "string" || !body.payment_id) {
      return { ok: false, status: 422, reason: "unrecognised_event" };
    }

    const observed: ObservedPayment = {
      providerPaymentId: body.payment_id,
      status,
      amount: typeof body.amount === "number" ? body.amount : null,
      currency: typeof body.currency === "string" ? body.currency : null,
      transactionId: typeof body.transaction_id === "string" ? body.transaction_id : null,
      eventId: typeof body.event_id === "string" ? body.event_id : null,
      eventType: typeof body.type === "string" ? body.type : null,
    };
    return { ok: true, observed };
  },

  async refundPayment(): Promise<RefundResult> {
    // The only provider allowed to answer "refunded" instantly, because it moves no money.
    return { ok: true, status: "refunded" };
  },

  acknowledge({ ok, reason }) {
    return Response.json({ ok, reason: reason ?? null }, { status: ok ? 200 : 422 });
  },
};

const STATUS_VALUES: Record<ProviderPaymentStatus, true> = {
  pending: true,
  processing: true,
  success: true,
  failed: true,
  cancelled: true,
  refunded: true,
};
