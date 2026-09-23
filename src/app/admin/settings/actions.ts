"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null; saved: boolean };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The kk/ru pairs this form carries. Reused to fill in whichever side the admin
 * left blank — the form itself shows only the Kazakh input, with the Russian one
 * folded under a collapsed "перевод" section that starts empty when a value has
 * never been set.
 */
function payload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");

  return {
    // name is the NOT NULL service column, kept in step with the localized ones.
    name: nameKk ?? nameRu,
    name_kk: nameKk,
    name_ru: nameRu,
    address_kk: field(form, "address_kk"),
    address_ru: field(form, "address_ru"),
    phone: field(form, "phone"),
    email: field(form, "email"),
  };
}

const FIELD_PAIRS = [
  ["name_kk", "name_ru"],
  ["address_kk", "address_ru"],
] as const;

async function fillTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  let filled = data;
  for (const [kk, ru] of FIELD_PAIRS) {
    const [result] = await translateFieldPair([filled], kk, ru);
    filled = result;
  }
  return filled;
}

export async function updateOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен.", saved: false };

  const data = await fillTranslations(payload(form));
  if (!data.name) return { error: "Укажите название хотя бы на одном языке.", saved: false };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение.", saved: false };

  const supabase = await createClient();
  const { error, count } = await supabase.from("organizations").update(data, { count: "exact" }).eq("id", organizationId);

  if (error) return { error: `Не удалось сохранить: ${error.message}`, saved: false };

  // RLS filters rows instead of refusing the statement, so a denied edit changes
  // nothing and reports no error. Without this check it would look like success.
  if (count === 0) return { error: "Недостаточно прав для изменения карточки учреждения.", saved: false };

  // The footer and the contacts block read these on every public page.
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");

  return { error: null, saved: true };
}
