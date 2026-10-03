import { createAdminClient } from "@/lib/supabase/admin";

export type BankConnectionStatus = {
  /** False while SUPABASE_SERVICE_ROLE_KEY is not set on the server: nothing can be stored or read. */
  serverReady: boolean;
  hasSecret: boolean;
  merchantId: string | null;
};

/**
 * What is stored for a payment method, without the secret itself.
 *
 * The secret is never sent to the browser, not even to staff: the form only learns that one
 * exists, and replacing it means typing a new one.
 */
export async function getBankConnection(methodId: string): Promise<BankConnectionStatus> {
  const admin = createAdminClient();
  if (!admin) return { serverReady: false, hasSecret: false, merchantId: null };

  const { data } = await admin
    .from("organization_payment_secrets")
    .select("merchant_id, secret_key")
    .eq("organization_payment_method_id", methodId)
    .maybeSingle();

  return {
    serverReady: true,
    hasSecret: Boolean(data?.secret_key),
    merchantId: (data?.merchant_id as string | null) ?? null,
  };
}
