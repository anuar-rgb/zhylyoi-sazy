"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";
import { MEDIA_BUCKET } from "@/lib/storage";
import { hasProvider } from "@/lib/payments/registry";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function revalidatePayments(id?: string) {
  revalidatePath("/admin/tickets/payments");
  if (id) revalidatePath(`/admin/tickets/payments/${id}`);
}

function paymentPayload(form: FormData) {
  return {
    provider_code: field(form, "provider_code"),
    display_name_kk: field(form, "display_name_kk"),
    display_name_ru: field(form, "display_name_ru"),
    is_default: form.get("is_default") === "on",
  };
}

async function fillPaymentTranslations(
  data: ReturnType<typeof paymentPayload>
): Promise<ReturnType<typeof paymentPayload>> {
  const [filled] = await translateFieldPair([data], "display_name_kk", "display_name_ru");
  return filled;
}

export async function createPaymentMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillPaymentTranslations(paymentPayload(form));
  if (!data.provider_code) return { error: "Выберите провайдера." };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  // Only a bank the site is connected to: the buyer pays on its page and the order confirms itself.
  if (!hasProvider(data.provider_code)) return { error: "Для этого провайдера нет подключения к банку." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("organization_payment_methods")
    .insert({
      organization_id: organizationId,
      provider_code: data.provider_code,
      display_name_kk: data.display_name_kk,
      display_name_ru: data.display_name_ru,
      is_default: data.is_default,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        error?.code === "23505"
          ? "Такой провайдер уже добавлен для этой организации."
          : "Не удалось добавить способ оплаты.",
    };
  }

  revalidatePayments();
  await flash("Добавлено");
  redirect(`/admin/tickets/payments/${created.id}`);
}

export async function updatePaymentMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Способ оплаты не найден." };

  const data = await fillPaymentTranslations(paymentPayload(form));

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("organization_payment_methods")
    .update(
      {
        display_name_kk: data.display_name_kk,
        display_name_ru: data.display_name_ru,
      },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidatePayments(id);
  return { error: null };
}

/**
 * «Подключить» on a payment system's card: adds it as this institution's method (switched off for
 * buyers until the bank's details are saved and card payment is turned on) and opens its page.
 */
export async function connectPaymentProvider(providerCode: string): Promise<{ error: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };
  if (!hasProvider(providerCode)) return { error: "Для этого провайдера нет подключения к банку." };
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organization_payment_methods")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider_code", providerCode)
    .maybeSingle();
  if (existing) redirect(`/admin/tickets/payments/${existing.id}`);

  const { count } = await supabase
    .from("organization_payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  const { data: created, error } = await supabase
    .from("organization_payment_methods")
    .insert({ organization_id: organizationId, provider_code: providerCode, is_default: (count ?? 0) === 0 })
    .select("id")
    .single();
  if (error || !created) return { error: "Не удалось подключить." };

  revalidatePayments();
  redirect(`/admin/tickets/payments/${created.id}`);
}

export async function setPaymentMethodEnabled(id: string, isEnabled: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error, count } = await supabase
    .from("organization_payment_methods")
    .update({ is_enabled: isEnabled }, { count: "exact" })
    .eq("id", id);

  if (!error && count === 1) revalidatePath("/admin/tickets/payments");
  return { ok: !error && count === 1 };
}

/**
 * Two updates, not one: the partial unique index allows only one is_default=true
 * row per organization, so the previous default has to be cleared first. There is
 * a brief moment between the two statements with no default set at all — harmless,
 * nothing reads is_default outside of an admin page render and /my-ticket's method
 * ordering, neither of which runs mid-request here.
 */
export async function setPaymentMethodDefault(id: string): Promise<{ ok: boolean }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile || !identity.organizationId) return { ok: false };

  const supabase = await createClient();

  await supabase
    .from("organization_payment_methods")
    .update({ is_default: false })
    .eq("organization_id", identity.organizationId)
    .neq("id", id);

  const { error, count } = await supabase
    .from("organization_payment_methods")
    .update({ is_default: true }, { count: "exact" })
    .eq("id", id);

  if (!error && count === 1) revalidatePath("/admin/tickets/payments");
  return { ok: !error && count === 1 };
}

export async function deletePaymentMethod(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const supabase = await createClient();

  // Read before delete: once the row is gone, its path is gone with it, and the
  // file would be orphaned in Storage forever.
  const { data: method } = await supabase
    .from("organization_payment_methods")
    .select("static_qr_image_path")
    .eq("id", id)
    .maybeSingle();

  const { error, count } = await supabase.from("organization_payment_methods").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  if (method?.static_qr_image_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([method.static_qr_image_path]);
  }

  revalidatePayments();
  return { ok: true };
}
