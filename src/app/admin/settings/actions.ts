"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";
import { resolveMapPoint } from "@/lib/mapLinks";

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
    // Official names are copied from the registration documents, never machine-translated:
    // a side left blank stays blank and the page shows the other language.
    legal_name_kk: field(form, "legal_name_kk"),
    legal_name_ru: field(form, "legal_name_ru"),
    bin: field(form, "bin")?.replace(/s+/g, "") ?? null,
    director: field(form, "director"),
    founder_kk: field(form, "founder_kk"),
    founder_ru: field(form, "founder_ru"),
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
  if (data.bin && !/^d{12}$/.test(data.bin)) return { error: "БИН — это 12 цифр.", saved: false };

  const mapInput = field(form, "map_point");
  const mapPoint = mapInput ? await resolveMapPoint(mapInput) : null;
  if (mapInput && !mapPoint) {
    return {
      error:
        "Не удалось найти точку по ссылке на карту. Откройте здание в Google Картах или 2ГИС, скопируйте ссылку " +
        "из адресной строки или координаты (например 46.9621, 54.0129) и вставьте ещё раз.",
      saved: false,
    };
  }

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение.", saved: false };

  const supabase = await createClient();
  const { error, count } = await supabase.from("organizations").update({ ...data, map_lat: mapPoint?.lat ?? null, map_lng: mapPoint?.lng ?? null }, { count: "exact" }).eq("id", organizationId);

  if (error) return { error: `Не удалось сохранить: ${error.message}`, saved: false };

  // RLS filters rows instead of refusing the statement, so a denied edit changes
  // nothing and reports no error. Without this check it would look like success.
  if (count === 0) return { error: "Недостаточно прав для изменения карточки учреждения.", saved: false };

  // The footer and the contacts block read these on every public page.
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");

  return { error: null, saved: true };
}
