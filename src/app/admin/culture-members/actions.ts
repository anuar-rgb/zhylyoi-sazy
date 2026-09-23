"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureMemberById, type MemberImage } from "@/lib/cultureMembers";
import { MEDIA_BUCKET } from "@/lib/storage";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The photo widget submits its state as JSON in a hidden input. */
function parseImages(form: FormData): MemberImage[] {
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
    education_kk: field(form, "education_kk"),
    education_ru: field(form, "education_ru"),
    specialty_kk: field(form, "specialty_kk"),
    specialty_ru: field(form, "specialty_ru"),
    level_kk: field(form, "level_kk"),
    level_ru: field(form, "level_ru"),
    has_higher_education: form.get("has_higher_education") === "on",
    sort_order: order !== null && Number.isFinite(order) ? order : 0,
    is_active: form.get("is_active") === "on",
    images: parseImages(form),
  };
}

/** The public page reads the table directly, so a change has to reach it too. */
function revalidateMembers() {
  revalidatePath("/admin/culture-members");
  revalidatePath("/[locale]/members", "page");
}

export async function createMember(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = payload(form);
  if (!data.name) return { error: "Укажите имя хотя бы на одном языке." };

  // A platform admin belongs to no institution, so fall back to the site's own.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase.from("culture_members").insert({ ...data, organization_id: organizationId });

  if (error) return { error: "Не удалось сохранить артиста." };

  revalidateMembers();
  redirect("/admin/culture-members");
}

export async function updateMember(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Артист не найден." };

  const data = payload(form);
  if (!data.name) return { error: "Укажите имя хотя бы на одном языке." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_members")
    .update({ ...data, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidateMembers();
  redirect("/admin/culture-members");
}

export async function deleteMember(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const member = await getCultureMemberById(id);
  if (!member) return { ok: false, error: "Артист не найден." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_members").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить артиста." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // Only after the row is gone, and only for files that are actually ours — the
  // portraits carried over from the page file live in the app and have no path.
  const paths = member.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateMembers();
  return { ok: true };
}
