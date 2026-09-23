"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import {
  clearTelegramToken,
  saveTelegramSettings,
  sendTelegramTest,
  type TelegramTestResult,
} from "@/lib/orgTelegram";

export type FormState = { error: string | null; saved: boolean };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен.", saved: false };

  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");
  if (!nameKk && !nameRu) return { error: "Укажите название хотя бы на одном языке.", saved: false };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение.", saved: false };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("organizations")
    .update(
      {
        // name is the NOT NULL service column, kept in step with the localized ones.
        name: nameKk ?? nameRu,
        name_kk: nameKk,
        name_ru: nameRu,
        address_kk: field(form, "address_kk"),
        address_ru: field(form, "address_ru"),
        phone: field(form, "phone"),
        email: field(form, "email"),
      },
      { count: "exact" }
    )
    .eq("id", organizationId);

  if (error) return { error: `Не удалось сохранить: ${error.message}`, saved: false };

  // RLS filters rows instead of refusing the statement, so a denied edit changes
  // nothing and reports no error. Without this check it would look like success.
  if (count === 0) return { error: "Недостаточно прав для изменения карточки учреждения.", saved: false };

  // The footer and the contacts block read these on every public page.
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");

  return { error: null, saved: true };
}

export type TelegramState = { error: string | null; saved: boolean; tested: TelegramTestResult | null };

/** Resolves the institution this administrator acts for, or an error to show. */
async function currentOrganization(): Promise<{ id: string } | { error: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = identity.organizationId ?? (await getSiteOrganizationId());
  if (!id) return { error: "Не удалось определить учреждение." };

  return { id };
}

export async function updateTelegram(_prev: TelegramState, form: FormData): Promise<TelegramState> {
  const org = await currentOrganization();
  if ("error" in org) return { error: org.error, saved: false, tested: null };

  // The form never shows the stored token, so an empty field has to mean "leave it
  // alone". Erasing it is the separate button below, which says what it does.
  if (form.get("intent") === "clear") {
    const cleared = await clearTelegramToken(org.id);
    if (!cleared) return { error: "Недостаточно прав, чтобы убрать токен.", saved: false, tested: null };
    revalidatePath("/admin/settings");
    return { error: null, saved: true, tested: null };
  }

  if (form.get("intent") === "test") {
    const tested = await sendTelegramTest(org.id);
    return { error: null, saved: false, tested };
  }

  const botToken = field(form, "bot_token");
  const chatId = field(form, "chat_id");
  const isEnabled = form.get("is_enabled") === "on";

  const saved = await saveTelegramSettings(org.id, { botToken, chatId, isEnabled });
  if (!saved) return { error: "Не удалось сохранить настройки бота.", saved: false, tested: null };

  revalidatePath("/admin/settings");
  return { error: null, saved: true, tested: null };
}
