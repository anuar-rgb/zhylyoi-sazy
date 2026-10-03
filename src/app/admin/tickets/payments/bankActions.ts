"use server";

import { revalidatePath } from "next/cache";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import { createAdminClient } from "@/lib/supabase/admin";

export type BankFormState = { error: string | null };

const MAX_LENGTH = 500;

function text(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Stores or clears the keys a bank gave the institution.
 *
 * The table is closed to every browser-facing role, so this goes through the service-role client.
 * That client ignores RLS, which is why the checks here are explicit: the caller must be staff,
 * and the payment method must belong to their own institution. A method is readable by other
 * institutions' staff (the visitor-facing policy publishes enabled ones), so seeing it proves
 * nothing about the right to write its keys.
 */
export async function saveBankConnection(_prev: BankFormState, form: FormData): Promise<BankFormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const methodId = text(form, "method_id");
  if (!methodId) return { error: "Способ оплаты не найден." };

  const method = await getPaymentMethodById(methodId);
  if (!method) return { error: "Способ оплаты не найден." };
  if (identity.organizationId && identity.organizationId !== method.organizationId) {
    return { error: "Недостаточно прав для этого способа оплаты." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: "На сервере не задан служебный ключ (SUPABASE_SERVICE_ROLE_KEY). Ключи пока сохранить нельзя." };
  }

  if (form.get("remove") === "on") {
    const { error } = await admin
      .from("organization_payment_secrets")
      .delete()
      .eq("organization_payment_method_id", methodId);
    if (error) return { error: "Не удалось удалить ключи." };
    revalidatePath(`/admin/tickets/payments/${methodId}`);
    return { error: null };
  }

  const merchantId = text(form, "merchant_id");
  const secretKey = text(form, "secret_key");
  if ((merchantId?.length ?? 0) > MAX_LENGTH || (secretKey?.length ?? 0) > MAX_LENGTH) {
    return { error: "Значение слишком длинное." };
  }

  const { data: existing } = await admin
    .from("organization_payment_secrets")
    .select("secret_key")
    .eq("organization_payment_method_id", methodId)
    .maybeSingle();

  // Left empty, the secret stays as it was: the form never shows it back, so an empty field
  // cannot mean "set it to nothing".
  const nextSecret = secretKey ?? (existing?.secret_key as string | null | undefined) ?? null;
  if (!nextSecret) return { error: "Укажите секретный ключ." };

  const { error } = await admin.from("organization_payment_secrets").upsert(
    {
      organization_payment_method_id: methodId,
      merchant_id: merchantId,
      secret_key: nextSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_payment_method_id" }
  );
  if (error) return { error: "Не удалось сохранить ключи." };

  revalidatePath(`/admin/tickets/payments/${methodId}`);
  return { error: null };
}
