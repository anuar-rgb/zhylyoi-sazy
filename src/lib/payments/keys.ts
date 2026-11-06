import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, secretsKeyConfigured } from "./secretBox";
import type { PaymentSecrets } from "./types";

export type BankConnectionStatus = {
  /** False while SUPABASE_SERVICE_ROLE_KEY is not set on the server: nothing can be stored or read. */
  serverReady: boolean;
  hasSecret: boolean;
  merchantId: string | null;
  clientId: string | null;
  /** False while PAYMENT_SECRETS_KEY is not set on the server: a secret could not be stored safely. */
  keyReady: boolean;
};

/**
 * What is stored for a payment method, without the secret itself.
 *
 * The secret is never sent to the browser, not even to staff: the form only learns that one
 * exists, and replacing it means typing a new one.
 */
export async function getBankConnection(methodId: string): Promise<BankConnectionStatus> {
  const admin = createAdminClient();
  if (!admin) return { serverReady: false, hasSecret: false, merchantId: null, clientId: null, keyReady: secretsKeyConfigured() };

  const { data } = await admin
    .from("organization_payment_secrets")
    .select("merchant_id, client_id, secret_key")
    .eq("organization_payment_method_id", methodId)
    .maybeSingle();

  return {
    serverReady: true,
    hasSecret: Boolean(data?.secret_key),
    merchantId: (data?.merchant_id as string | null) ?? null,
    clientId: (data?.client_id as string | null) ?? null,
    keyReady: secretsKeyConfigured(),
  };
}

/** The columns of organization_payment_secrets, read with the service role, as a provider wants them. */
export function toSecrets(row: { merchant_id?: unknown; client_id?: unknown; secret_key?: unknown } | null): PaymentSecrets | null {
  if (!row?.secret_key) return null;
  const secretKey = decryptSecret(String(row.secret_key));
  if (!secretKey) return null;
  return {
    merchantId: (row.merchant_id as string | null) ?? null,
    clientId: (row.client_id as string | null) ?? null,
    secretKey,
  };
}
