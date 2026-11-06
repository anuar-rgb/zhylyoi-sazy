"use server";

import { revalidatePath } from "next/cache";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasProvider } from "@/lib/payments/registry";
import { encryptSecret } from "@/lib/payments/secretBox";

export type BankFormState = { error: string | null };

const MAX_LENGTH = 500;

function text(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A staff member of the method's own institution, and the method. The secrets table is reachable
 * only with the service-role client, which ignores RLS, so this check is what guards it: seeing a
 * method proves nothing, the visitor-facing policy publishes enabled ones.
 */
async function ownMethod(methodId: string | null) {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." } as const;
  if (!methodId) return { error: "Способ оплаты не найден." } as const;
  const method = await getPaymentMethodById(methodId);
  if (!method) return { error: "Способ оплаты не найден." } as const;
  if (identity.organizationId && identity.organizationId !== method.organizationId) {
    return { error: "Недостаточно прав для этого способа оплаты." } as const;
  }
  return { method } as const;
}

/** Stores or clears the three values a bank gives the institution. The secret is stored encrypted. */
export async function saveBankConnection(_prev: BankFormState, form: FormData): Promise<BankFormState> {
  const methodId = text(form, "method_id");
  const owned = await ownMethod(methodId);
  if ("error" in owned) return { error: owned.error ?? null };

  const admin = createAdminClient();
  if (!admin) return { error: "На сервере не задан служебный ключ (SUPABASE_SERVICE_ROLE_KEY). Данные пока сохранить нельзя." };

  if (form.get("remove") === "on") {
    // Without keys the bank cannot be used, so the method goes back to manual with them.
    const { error } = await admin.from("organization_payment_methods").update({ mode: "manual" }).eq("id", owned.method.id);
    if (error) return { error: "Не удалось удалить данные." };
    const { error: deleteError } = await admin.from("organization_payment_secrets").delete().eq("organization_payment_method_id", owned.method.id);
    if (deleteError) return { error: "Не удалось удалить данные." };
    revalidatePath(`/admin/tickets/payments/${owned.method.id}`);
    return { error: null };
  }

  const terminalId = text(form, "terminal_id");
  const clientId = text(form, "client_id");
  const clientSecret = text(form, "client_secret");
  if ([terminalId, clientId, clientSecret].some((value) => (value?.length ?? 0) > MAX_LENGTH)) {
    return { error: "Значение слишком длинное." };
  }
  if (!terminalId || !clientId) return { error: "Укажите TerminalID и ClientID." };

  const { data: existing } = await admin
    .from("organization_payment_secrets")
    .select("secret_key")
    .eq("organization_payment_method_id", owned.method.id)
    .maybeSingle();

  // Left empty, the secret stays as it was: the form never shows it back, so an empty field
  // cannot mean "set it to nothing".
  const nextSecret = clientSecret ? encryptSecret(clientSecret) : ((existing?.secret_key as string | null | undefined) ?? null);
  if (clientSecret && !nextSecret) return { error: "На сервере не задан PAYMENT_SECRETS_KEY: без него секрет не сохраняется." };
  if (!nextSecret) return { error: "Укажите ClientSecret." };

  const { error } = await admin.from("organization_payment_secrets").upsert(
    {
      organization_payment_method_id: owned.method.id,
      merchant_id: terminalId,
      client_id: clientId,
      secret_key: nextSecret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_payment_method_id" }
  );
  if (error) return { error: "Не удалось сохранить данные." };

  revalidatePath(`/admin/tickets/payments/${owned.method.id}`);
  return { error: null };
}

/**
 * How this method's payments are confirmed: "manual", staff by hand, or "api", the bank itself.
 * Turning the bank on needs the integration and all its keys: without them every buyer would press
 * Pay and get nothing.
 */
export async function setPaymentMode(_prev: BankFormState, form: FormData): Promise<BankFormState> {
  const mode = text(form, "mode");
  if (mode !== "manual" && mode !== "api") return { error: "Способ оплаты не найден." };
  const owned = await ownMethod(text(form, "method_id"));
  if ("error" in owned) return { error: owned.error ?? null };

  if (mode === "api") {
    if (!hasProvider(owned.method.providerCode)) return { error: "Для этого банка автоматическое подтверждение сейчас выключено." };
    const admin = createAdminClient();
    const { data } = admin
      ? await admin
          .from("organization_payment_secrets")
          .select("merchant_id, client_id, secret_key")
          .eq("organization_payment_method_id", owned.method.id)
          .maybeSingle()
      : { data: null };
    if (!data?.secret_key || !data.merchant_id || !data.client_id) return { error: "Сначала сохраните данные банка." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase.from("organization_payment_methods").update({ mode }, { count: "exact" }).eq("id", owned.method.id);
  if (error) return { error: "Не удалось сохранить режим." };
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidatePath(`/admin/tickets/payments/${owned.method.id}`);
  return { error: null };
}
