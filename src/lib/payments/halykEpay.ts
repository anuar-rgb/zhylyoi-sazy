import { createHmac } from "node:crypto";
import type {
  CheckoutForm,
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
 * Halyk ePay, written against https://epayment.kz/docs (payment page, status check, refund).
 *
 * The buyer enters the card only on Halyk's own form, opened by /pay/<payment> through Halyk's
 * script. Their notifications carry no signature, so one is never believed: it only prompts us to
 * ask Halyk for the status with our own credentials, and that answer is what counts.
 *
 * Terminal = secrets.merchantId, ClientID = secrets.clientId, ClientSecret = secrets.secretKey.
 * Test servers under `next dev`, live servers on a built site: a test card can never buy a ticket
 * on the live site.
 */
const LIVE = process.env.NODE_ENV === "production";
const OAUTH_URL = LIVE ? "https://epay-oauth.homebank.kz/oauth2/token" : "https://test-epay-oauth.epayment.kz/oauth2/token";
const API_URL = LIVE ? "https://epay-api.homebank.kz" : "https://test-epay-api.epayment.kz";
const SCRIPT_URL = LIVE ? "https://epay.homebank.kz/payform/payment-api.js" : "https://test-epay.epayment.kz/payform/payment-api.js";
const TIMEOUT_MS = 15_000;

const STATUS: Record<string, ProviderPaymentStatus> = {
  CHARGE: "success",
  REFUND: "refunded",
  CANCEL: "cancelled",
  CANCEL_OLD: "cancelled",
  FAILED: "failed",
  REJECT: "failed",
  "3D": "failed",
  NEW: "processing",
  FINGERPRINT: "processing",
};

type Transaction = { id?: string; amount?: number; currency?: string; statusName?: string };

/** What the merchant sends with the token and Halyk echoes back in its notification. */
function secretHash(invoiceId: string, secrets: PaymentSecrets): string {
  return createHmac("sha256", secrets.secretKey).update(invoiceId).digest("hex").slice(0, 32);
}

async function requestToken(secrets: PaymentSecrets, extra: Record<string, string> = {}): Promise<Record<string, unknown> | null> {
  if (!secrets.clientId || !secrets.merchantId) return null;
  const body = new FormData();
  const fields: Record<string, string> = {
    grant_type: "client_credentials",
    scope: "payment",
    client_id: secrets.clientId,
    client_secret: secrets.secretKey,
    terminal: secrets.merchantId,
    ...extra,
  };
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  try {
    const res = await fetch(OAUTH_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return typeof data.access_token === "string" ? data : null;
  } catch {
    return null;
  }
}

async function operation(secrets: PaymentSecrets, transactionId: string, path: string): Promise<boolean> {
  const token = await requestToken(secrets);
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/operation/${encodeURIComponent(transactionId)}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${String(token.access_token)}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function readTransaction(invoiceId: string, secrets: PaymentSecrets): Promise<{ code: string; transaction: Transaction | null } | null> {
  const token = await requestToken(secrets);
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/check-status/payment/transaction/${encodeURIComponent(invoiceId)}`, {
      headers: { Authorization: `Bearer ${String(token.access_token)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { resultCode?: string; transaction?: Transaction | null };
    return { code: String(data.resultCode ?? ""), transaction: data.transaction ?? null };
  } catch {
    return null;
  }
}

/**
 * Where a payment stands, by Halyk's own word. A terminal set to two steps leaves a paid order in
 * AUTH (money blocked, not taken), so the charge happens here and the answer is read again.
 */
async function observe(invoiceId: string, secrets: PaymentSecrets, eventType: string): Promise<PaymentStatusResult> {
  let answer = await readTransaction(invoiceId, secrets);
  if (!answer) return { ok: false, reason: "status_unavailable" };

  if (answer.code === "100" && answer.transaction?.statusName === "AUTH" && answer.transaction.id) {
    if (!(await operation(secrets, answer.transaction.id, "charge"))) return { ok: false, reason: "charge_failed" };
    answer = await readTransaction(invoiceId, secrets);
    if (!answer) return { ok: false, reason: "status_unavailable" };
  }

  const waiting = (status: ProviderPaymentStatus): PaymentStatusResult => ({
    ok: true,
    observed: { providerPaymentId: invoiceId, status, amount: null, currency: null, transactionId: null, eventId: null, eventType },
  });
  // 102: nothing paid under this number yet. 107: Halyk is still working on it.
  if (answer.code === "102") return waiting("pending");
  if (answer.code === "107") return waiting("processing");
  // 100 is a transaction with a status; 101 is a rejected one, which still reports its status.
  if ((answer.code !== "100" && answer.code !== "101") || !answer.transaction?.statusName) {
    return { ok: false, reason: `result_${answer.code || "unknown"}` };
  }

  const { id, amount, currency, statusName } = answer.transaction;
  const status = STATUS[statusName];
  // Still AUTH right after a charge: Halyk has not caught up yet.
  if (!status) return statusName === "AUTH" ? waiting("processing") : { ok: false, reason: `status_${statusName}` };

  const observed: ObservedPayment = {
    providerPaymentId: invoiceId,
    status,
    amount: typeof amount === "number" ? amount : null,
    currency: typeof currency === "string" && currency ? currency : null,
    transactionId: id || null,
    eventId: id ? `${id}:${statusName}` : null,
    eventType,
  };
  return { ok: true, observed };
}

export const halykEpayProvider: PaymentProvider = {
  code: "halyk_epay",

  // Nothing to ask Halyk yet: the form opens by a token taken at the moment the buyer needs it.
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!input.secrets.clientId || !input.secrets.merchantId) return { ok: false, reason: "keys_incomplete" };
    return {
      ok: true,
      providerPaymentId: input.invoiceNumber,
      redirectUrl: `${new URL(input.returnUrl).origin}/pay/${input.paymentId}`,
      metadata: {
        description: input.description.slice(0, 60),
        back_link: input.returnUrl.replace("/payment/pending", "/payment/success"),
        failure_back_link: input.returnUrl.replace("/payment/pending", "/payment/failure"),
        post_link: input.webhookUrl,
      },
    };
  },

  async checkoutForm({ providerPaymentId, amount, currency, language, metadata, secrets }): Promise<CheckoutForm | null> {
    const postLink = String(metadata.post_link ?? "");
    const token = await requestToken(secrets, {
      invoiceID: providerPaymentId,
      secret_hash: secretHash(providerPaymentId, secrets),
      amount: String(amount),
      currency,
      postLink,
      failurePostLink: postLink,
    });
    if (!token) return null;
    return {
      scriptUrl: SCRIPT_URL,
      params: {
        invoiceId: providerPaymentId,
        backLink: String(metadata.back_link ?? ""),
        failureBackLink: String(metadata.failure_back_link ?? ""),
        postLink,
        failurePostLink: postLink,
        language: language === "kk" ? "kaz" : "rus",
        description: String(metadata.description ?? ""),
        terminal: String(secrets.merchantId),
        amount,
        currency,
        auth: token,
      },
    };
  },

  async getPaymentStatus({ providerPaymentId, secrets }) {
    return observe(providerPaymentId, secrets, "status_check");
  },

  async verifyWebhook({ rawBody, secrets }): Promise<VerifyWebhookResult> {
    let body: { invoiceId?: unknown; secret_hash?: unknown };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return { ok: false, status: 400, reason: "invalid_json" };
    }
    const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
    if (!/^\d{6,15}$/.test(invoiceId)) return { ok: false, status: 422, reason: "unrecognised_event" };
    if (typeof body.secret_hash === "string" && body.secret_hash && body.secret_hash !== secretHash(invoiceId, secrets)) {
      return { ok: false, status: 401, reason: "invalid_secret_hash" };
    }
    const answer = await observe(invoiceId, secrets, "post_link");
    return answer.ok ? answer : { ok: false, status: 503, reason: answer.reason };
  },

  async refundPayment({ transactionId, paymentId, secrets }): Promise<RefundResult> {
    if (!transactionId) return { ok: false, reason: "no_transaction_id" };
    const done = await operation(secrets, transactionId, `refund?externalID=${encodeURIComponent(paymentId)}`);
    return done ? { ok: true, status: "refunded" } : { ok: false, reason: "refund_refused" };
  },

  acknowledge({ ok, reason }) {
    return Response.json({ ok, reason: reason ?? null }, { status: ok ? 200 : 422 });
  },
};
