"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureStaffById, type StaffImage } from "@/lib/cultureStaff";
import { MEDIA_BUCKET } from "@/lib/storage";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The photo widget submits its state as JSON in a hidden input. */
function parseImages(form: FormData): StaffImage[] {
  const raw = form.get("images");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const url = (item as { url?: unknown })?.url;
      if (typeof url !== "string") return [];
      const path = (item as { path?: unknown })?.path;
      return [{ url, path: typeof path === "string" ? path : null }];
    });
  } catch {
    return [];
  }
}

/**
 * Column values shared by create and update.
 *
 * `name` is the NOT NULL service column. The form never asks for it — filling it
 * from whichever translation exists keeps the form to one name per language while
 * leaving the column honest.
 */
function payload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");

  const orderRaw = field(form, "sort_order");
  const order = orderRaw !== null ? Number.parseInt(orderRaw, 10) : null;

  return {
    name: nameKk ?? nameRu,
    name_kk: nameKk,
    name_ru: nameRu,
    role_kk: field(form, "role_kk"),
    role_ru: field(form, "role_ru"),
    description_kk: field(form, "description_kk"),
    description_ru: field(form, "description_ru"),
    phone: field(form, "phone"),
    email: field(form, "email"),
    sort_order: order !== null && Number.isFinite(order) ? order : 0,
    is_active: form.get("is_active") === "on",
    images: parseImages(form),
  };
}

/**
 * The kk/ru pairs this form carries. Reused to fill in whichever side the admin
 * left blank — the form itself shows only the Kazakh input, with the Russian one
 * folded under a collapsed "перевод" section that starts empty on a new record.
 */
const FIELD_PAIRS = [
  ["name_kk", "name_ru"],
  ["role_kk", "role_ru"],
  ["description_kk", "description_ru"],
] as const;

async function fillTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  let filled = data;
  for (const [kk, ru] of FIELD_PAIRS) {
    const [result] = await translateFieldPair([filled], kk, ru);
    filled = result;
  }
  return filled;
}

/** The public page reads the table directly, so a change has to reach it too. */
function revalidateStaff() {
  revalidatePath("/admin/culture-staff");
  revalidatePath("/[locale]/staff", "page");
}

export async function createStaff(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillTranslations(payload(form));
  if (!data.name) return { error: "Укажите имя хотя бы на одном языке." };

  // A platform admin belongs to no institution, so fall back to the site's own.
  // With several institutions this becomes a picker in the form.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase.from("culture_staff").insert({ ...data, organization_id: organizationId });

  if (error) return { error: "Не удалось сохранить сотрудника." };

  revalidateStaff();
  redirect("/admin/culture-staff");
}

export async function updateStaff(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Сотрудник не найден." };

  const data = await fillTranslations(payload(form));
  if (!data.name) return { error: "Укажите имя хотя бы на одном языке." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_staff")
    .update({ ...data, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidateStaff();
  redirect("/admin/culture-staff");
}

export async function deleteStaff(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const person = await getCultureStaffById(id);
  if (!person) return { ok: false, error: "Сотрудник не найден." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_staff").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить сотрудника." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // Only after the row is gone, and only for files that are actually ours.
  const paths = person.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateStaff();
  return { ok: true };
}
