import { createClient } from "@/lib/supabase/server";

export type PaymentProviderRecord = {
  code: string;
  name: string;
  integrationType: string;
};

export type PaymentMethodRecord = {
  id: string;
  organizationId: string;
  providerCode: string;
  providerName: string;
  displayNameKk: string | null;
  displayNameRu: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  staticQrImageUrl: string | null;
  staticQrImagePath: string | null;
  mode: string;
};

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toMethod(row: Row): PaymentMethodRecord {
  const provider = row.payment_providers as Row | null;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    providerCode: String(row.provider_code),
    providerName: provider ? String(provider.name) : String(row.provider_code),
    displayNameKk: str(row.display_name_kk),
    displayNameRu: str(row.display_name_ru),
    isEnabled: row.is_enabled === true,
    isDefault: row.is_default === true,
    staticQrImageUrl: str(row.static_qr_image_url),
    staticQrImagePath: str(row.static_qr_image_path),
    mode: String(row.mode ?? "manual"),
  };
}

/** One payment method by id, for the edit form. Null when missing or not visible to the caller. */
export async function getPaymentMethodById(id: string): Promise<PaymentMethodRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_payment_methods")
    .select("*, payment_providers(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toMethod(data as unknown as Row);
}

/** Every payment provider on the platform — for the "add a payment method" form's select. */
export async function listPaymentProviders(): Promise<PaymentProviderRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payment_providers").select("code, name, integration_type").order("name");

  if (error || !data) return [];
  return (data as unknown as Row[]).map((row) => ({
    code: String(row.code),
    name: String(row.name),
    integrationType: String(row.integration_type),
  }));
}

/**
 * An institution's payment methods, for the admin page. RLS scopes this to the
 * caller's own organization and includes disabled methods — staff need to see a
 * turned-off method to turn it back on.
 */
export async function listPaymentMethods(organizationId: string): Promise<PaymentMethodRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_payment_methods")
    .select("*, payment_providers(name)")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("created_at");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toMethod);
}

/**
 * An institution's enabled payment methods, default first, for /my-ticket. Filtered
 * on is_enabled here too, not just trusted to RLS — the same belt-and-suspenders
 * pattern as listPublicHallSeats filtering is_active on top of its own read policy.
 */
export async function listPublicPaymentMethods(organizationId: string): Promise<PaymentMethodRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_payment_methods")
    .select("*, payment_providers(name)")
    .eq("organization_id", organizationId)
    .eq("is_enabled", true)
    .order("is_default", { ascending: false })
    .order("created_at");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toMethod);
}
