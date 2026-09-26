"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";
import { MEDIA_BUCKET } from "@/lib/storage";

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

/** Parses the hidden qr_image field: "" means no image, otherwise {url, path} JSON. */
function parseQrImage(form: FormData): { url: string | null; path: string | null } {
  const raw = field(form, "qr_image");
  if (!raw) return { url: null, path: null };
  try {
    const parsed = JSON.parse(raw) as { url?: string; path?: string };
    return { url: parsed.url ?? null, path: parsed.path ?? null };
  } catch {
    return { url: null, path: null };
  }
}

export async function createPaymentMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillPaymentTranslations(paymentPayload(form));
  if (!data.provider_code) return { error: "Выберите провайдера." };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const { url, path } = parseQrImage(form);

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("organization_payment_methods")
    .insert({
      organization_id: organizationId,
      provider_code: data.provider_code,
      display_name_kk: data.display_name_kk,
      display_name_ru: data.display_name_ru,
      is_default: data.is_default,
      static_qr_image_url: url,
      static_qr_image_path: path,
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
  redirect(`/admin/tickets/payments/${created.id}`);
}

export async function updatePaymentMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Способ оплаты не найден." };

  const data = await fillPaymentTranslations(paymentPayload(form));
  const { url, path } = parseQrImage(form);

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("organization_payment_methods")
    .update(
      {
        display_name_kk: data.display_name_kk,
        display_name_ru: data.display_name_ru,
        static_qr_image_url: url,
        static_qr_image_path: path,
      },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidatePayments(id);
  return { error: null };
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
