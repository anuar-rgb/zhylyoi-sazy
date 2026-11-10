"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { MEDIA_BUCKET } from "@/lib/storage";
import { hasIntegration } from "@/lib/payments/registry";

function revalidatePayments(id?: string) {
  revalidatePath("/admin/tickets/payments");
  if (id) revalidatePath(`/admin/tickets/payments/${id}`);
}

/**
 * «Подключить» on a payment system's card: adds it as this institution's method (switched off for
 * buyers until the bank's details are saved and card payment is turned on) and opens its page.
 */
export async function connectPaymentProvider(providerCode: string): Promise<{ error: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };
  if (!hasIntegration(providerCode)) return { error: "Для этого провайдера нет подключения к банку." };
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
