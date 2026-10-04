import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentSecrets } from "./types";

/**
 * Everything the payment pipeline needs from the database, behind one interface.
 *
 * The pipeline (pipeline.ts) is plain logic over this interface, so it is tested with an in-memory
 * store and no database. The rules that must hold under concurrency (settling a payment exactly
 * once, giving seats back, refunds) are not here: they live in SQL functions (settle_payment,
 * apply_refund) that this store only calls.
 */
export type MethodRow = { id: string; organizationId: string; providerCode: string; isEnabled: boolean };

export type PaymentRow = {
  id: string;
  organizationId: string;
  bookingId: string;
  paymentMethodId: string | null;
  providerCode: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type WebhookLogEntry = {
  providerCode: string;
  paymentMethodId: string;
  organizationId: string;
  eventId: string | null;
  paymentId: string | null;
  eventType: string | null;
  payloadHash: string;
  status: "received" | "rejected";
  error?: string | null;
};

export interface PaymentStore {
  findMethod(methodId: string): Promise<MethodRow | null>;
  getSecrets(methodId: string): Promise<PaymentSecrets | null>;
  logWebhook(entry: WebhookLogEntry): Promise<string | null>;
  finishWebhook(id: string | null, status: "processed" | "ignored" | "rejected" | "error", error?: string | null): Promise<void>;
  findPaymentByProviderId(organizationId: string, providerCode: string, providerPaymentId: string): Promise<PaymentRow | null>;
  /** The atomic step: payment SUCCESS and booking confirmed together, or neither. */
  settle(paymentId: string, amount: number, currency: string, transactionId: string | null): Promise<{ outcome: string; bookingId: string | null }>;
  /** Moves a payment forward only from the listed statuses; false when it was somewhere else. */
  updatePaymentStatus(
    paymentId: string,
    patch: { status: string; failureReason?: string | null; transactionId?: string | null },
    onlyFrom: string[]
  ): Promise<boolean>;
  applyRefund(paymentId: string): Promise<string>;
  listStalePayments(olderThan: Date, limit: number): Promise<PaymentRow[]>;
  noteReconcileProblem(paymentId: string, problem: string): Promise<void>;
}

type Row = Record<string, unknown>;

function toPayment(row: Row): PaymentRow {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    bookingId: String(row.booking_id),
    paymentMethodId: typeof row.payment_method_id === "string" ? row.payment_method_id : null,
    providerCode: String(row.provider_code),
    providerPaymentId: typeof row.provider_payment_id === "string" ? row.provider_payment_id : null,
    amount: Number(row.amount),
    currency: String(row.currency ?? "KZT"),
    status: String(row.status),
    metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {},
  };
}

/** The real store, over the service-role client. Throws when the server key is not configured. */
export function createSupabaseStore(): PaymentStore {
  const admin = createAdminClient();
  if (!admin) throw new Error("payments_not_configured");

  return {
    async findMethod(methodId) {
      const { data } = await admin
        .from("organization_payment_methods")
        .select("id, organization_id, provider_code, is_enabled")
        .eq("id", methodId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: String(data.id),
        organizationId: String(data.organization_id),
        providerCode: String(data.provider_code),
        isEnabled: data.is_enabled === true,
      };
    },

    async getSecrets(methodId) {
      const { data } = await admin
        .from("organization_payment_secrets")
        .select("merchant_id, secret_key")
        .eq("organization_payment_method_id", methodId)
        .maybeSingle();
      if (!data?.secret_key) return null;
      return { merchantId: (data.merchant_id as string | null) ?? null, secretKey: String(data.secret_key) };
    },

    async logWebhook(entry) {
      const { data } = await admin
        .from("payment_webhook_events")
        .insert({
          provider_code: entry.providerCode,
          payment_method_id: entry.paymentMethodId,
          organization_id: entry.organizationId,
          event_id: entry.eventId,
          payment_id: entry.paymentId,
          event_type: entry.eventType,
          payload_hash: entry.payloadHash,
          status: entry.status,
          error: entry.error ?? null,
          processed_at: entry.status === "rejected" ? new Date().toISOString() : null,
        })
        .select("id")
        .maybeSingle();
      return data ? String(data.id) : null;
    },

    async finishWebhook(id, status, error) {
      if (!id) return;
      await admin
        .from("payment_webhook_events")
        .update({ status, error: error ?? null, processed_at: new Date().toISOString() })
        .eq("id", id);
    },

    async findPaymentByProviderId(organizationId, providerCode, providerPaymentId) {
      const { data } = await admin
        .from("payments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("provider_code", providerCode)
        .eq("provider_payment_id", providerPaymentId)
        .maybeSingle();
      return data ? toPayment(data as Row) : null;
    },

    async settle(paymentId, amount, currency, transactionId) {
      const { data, error } = await admin.rpc("settle_payment", {
        p_payment_id: paymentId,
        p_amount: amount,
        p_currency: currency,
        p_provider_txn: transactionId,
      });
      if (error) throw new Error(`settle_payment failed: ${error.message}`);
      const row = (data as { result: string; settled_booking_id: string | null }[] | null)?.[0];
      return { outcome: row?.result ?? "unknown_payment", bookingId: row?.settled_booking_id ?? null };
    },

    async updatePaymentStatus(paymentId, patch, onlyFrom) {
      const update: Row = { status: patch.status };
      if (patch.failureReason !== undefined) update.failure_reason = patch.failureReason;
      if (patch.transactionId) update.provider_transaction_id = patch.transactionId;
      const { data, error } = await admin
        .from("payments")
        .update(update)
        .eq("id", paymentId)
        .in("status", onlyFrom)
        .select("id");
      if (error) throw new Error(`payment update failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },

    async applyRefund(paymentId) {
      const { data, error } = await admin.rpc("apply_refund", { p_payment_id: paymentId });
      if (error) throw new Error(`apply_refund failed: ${error.message}`);
      return (data as { result: string }[] | null)?.[0]?.result ?? "unknown_payment";
    },

    async listStalePayments(olderThan, limit) {
      const { data, error } = await admin
        .from("payments")
        .select("*")
        .in("status", ["pending", "processing"])
        .not("provider_payment_id", "is", null)
        .lt("created_at", olderThan.toISOString())
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error || !data) return [];
      return (data as Row[]).map(toPayment);
    },

    async noteReconcileProblem(paymentId, problem) {
      await admin
        .from("payments")
        .update({ failure_reason: problem.slice(0, 200) })
        .eq("id", paymentId)
        .in("status", ["pending", "processing"]);
    },
  };
}
