"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { CONTENT_DEFAULTS } from "@/lib/siteContent";

export type FormState = { error: string | null; saved: number | null };

function value(form: FormData, name: string): string | null {
  const raw = form.get(name);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Stores the texts an institution changed.
 *
 * Only differences are written. A field left at the built-in wording, or cleared
 * back to it, is deleted rather than stored: the table then holds the answer to
 * "what did this institution change", and a later edit to the built-in text still
 * reaches everyone who never touched that field.
 */
export async function updateContent(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен.", saved: null };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение.", saved: null };

  const changed: { organization_id: string; key: string; value_kk: string | null; value_ru: string | null }[] = [];
  const reverted: string[] = [];

  for (const [key, fallback] of Object.entries(CONTENT_DEFAULTS)) {
    const kk = value(form, `${key}__kk`);
    const ru = value(form, `${key}__ru`);

    if (kk === fallback.kk && ru === fallback.ru) {
      reverted.push(key);
    } else {
      changed.push({ organization_id: organizationId, key, value_kk: kk, value_ru: ru });
    }
  }

  const supabase = await createClient();

  if (reverted.length > 0) {
    const { error } = await supabase
      .from("org_content")
      .delete()
      .eq("organization_id", organizationId)
      .in("key", reverted);
    if (error) return { error: `Не удалось сохранить: ${error.message}`, saved: null };
  }

  if (changed.length > 0) {
    const { error } = await supabase.from("org_content").upsert(changed, { onConflict: "organization_id,key" });
    if (error) return { error: `Не удалось сохранить: ${error.message}`, saved: null };
  }

  // These texts sit on the front page, in the layout and on the contacts page.
  revalidatePath("/admin/content");
  revalidatePath("/[locale]", "layout");

  return { error: null, saved: changed.length };
}
