/**
 * What a payment provider (a bank, an acquirer, or the mock) has to offer.
 *
 * One implementation per provider code (payment_providers.code). Everything else, which is to say
 * orders, payments, tickets, the webhook pipeline, reconciliation and refunds bookkeeping, lives
 * in provider-neutral code and never mentions a bank by name. Connecting a new bank means writing
 * one file that implements this interface and listing it in registry.ts.
 *
 * Nothing here may touch card data. The buyer enters it only on the provider's own page.
 */
export type PaymentSecrets = { merchantId: string | null; secretKey: string };

export type ProviderPaymentStatus = "pending" | "processing" | "success" | "failed" | "cancelled" | "refunded";

/** What the provider says about one payment, from a notification or from asking it directly. */
export type ObservedPayment = {
  /** The provider's identifier of the payment, as returned by createPayment. */
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  /** Null when the provider did not say. A success without an amount is never trusted. */
  amount: number | null;
  currency: string | null;
  transactionId: string | null;
  /** Identifier of the notification itself, for the journal. */
  eventId: string | null;
  eventType: string | null;
};

export type CreatePaymentInput = {
  /** Our payments.id: the reference the provider echoes back. */
  paymentId: string;
  /** The order number people can read out, e.g. DK-000154. */
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  /** Where the provider sends the buyer afterwards. Only shows the status; it proves nothing. */
  returnUrl: string;
  /** Where the provider sends its notifications. */
  webhookUrl: string;
  secrets: PaymentSecrets;
};

export type CreatePaymentResult =
  | {
      ok: true;
      providerPaymentId: string;
      redirectUrl: string;
      /** Non-secret provider data kept on the payment row (never card data, never a secret). */
      metadata?: Record<string, unknown>;
    }
  | { ok: false; reason: string };

export type VerifyWebhookResult =
  | { ok: true; observed: ObservedPayment }
  | { ok: false; status: 400 | 401 | 422; reason: string };

export type PaymentStatusResult = { ok: true; observed: ObservedPayment } | { ok: false; reason: string };

export type RefundResult = { ok: true; status: "pending" | "refunded" } | { ok: false; reason: string };

export interface PaymentProvider {
  /** payment_providers.code, e.g. "halyk_epay". */
  code: string;

  /** Start a payment at the provider and return where to send the buyer. */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Ask the provider where a payment stands. Used to reconcile payments whose notification never
   * arrived. When the provider cannot be reached the answer is ok:false and the payment simply
   * stays as it was: an outage is never read as a failed payment.
   */
  getPaymentStatus(input: {
    providerPaymentId: string;
    metadata: Record<string, unknown>;
    secrets: PaymentSecrets;
  }): Promise<PaymentStatusResult>;

  /**
   * Prove the notification came from the provider (signature, certificate, timestamp) and read it.
   * Must reject anything it cannot verify: this is the only thing standing between the open
   * internet and "mark this order paid".
   */
  verifyWebhook(input: { headers: Headers; rawBody: string; secrets: PaymentSecrets }): Promise<VerifyWebhookResult>;

  /** Ask the provider to return money. Only a provider confirmation ever makes a payment REFUNDED. */
  refundPayment(input: {
    providerPaymentId: string;
    amount: number;
    currency: string;
    secrets: PaymentSecrets;
  }): Promise<RefundResult>;

  /** The reply this provider expects to a notification; it retries until it gets one it likes. */
  acknowledge(outcome: { ok: boolean; reason?: string }): Response;
}
