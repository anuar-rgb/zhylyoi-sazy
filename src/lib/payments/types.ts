/**
 * What a bank integration has to provide. One adapter per provider (payment_providers.code);
 * everything else (finding the payment method, loading its keys, matching and confirming the
 * booking, the journal, idempotency) is shared in process.ts, so a new bank is one file.
 */
export type PaymentSecrets = { merchantId: string | null; secretKey: string };

export type ParsedPayment = {
  /** The bank's own identifier of this payment. The same value on every retry. */
  externalId: string;
  /** Our booking id, which the payment was created with. */
  bookingId: string;
  /** Amount actually paid, in tenge. */
  amount: number;
  /** False for a notification that is not a completed payment (created, failed, refunded...). */
  paid: boolean;
  /** Kept in the journal as received, minus anything secret. */
  raw: unknown;
};

export type ParseResult =
  | { ok: true; payment: ParsedPayment }
  | { ok: false; status: number; reason: string };

export interface PaymentAdapter {
  /** payment_providers.code, e.g. "kaspi_pay". */
  code: string;
  /**
   * Verify the bank's signature with the secrets and read the notification.
   * Must reject anything it cannot verify: this is the only thing standing between the open
   * internet and "mark this booking paid".
   */
  parse(input: { headers: Headers; rawBody: string; secrets: PaymentSecrets }): Promise<ParseResult>;
  /** The answer in the format this bank expects: it retries until it gets one it likes. */
  reply(result: { ok: boolean; reason?: string }): Response;
}
