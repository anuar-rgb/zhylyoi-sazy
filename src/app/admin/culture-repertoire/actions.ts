"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureRepertoireById } from "@/lib/cultureRepertoire";
import { asRepertoireCategory } from "@/lib/repertoireFields";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Column values shared by create and update.
 *
 * `title` is the NOT NULL service column, filled from whichever translation exists.
 * The category is passed through the same guard the reader uses, so a value that is
 * not a known code is stored as "other" rather than as something the page cannot
 * colour.
 */
function payload(form: FormData) {
  const titleKk = field(form, "title_kk");
  const titleRu = field(form, "title_ru");

  const orderRaw = field(form, "sort_order");
  const order = orderRaw !== null ? Number.parseInt(orderRaw, 10) : null;

  return {
    title: titleKk ?? titleRu,
    title_kk: titleKk,
    title_ru: titleRu,
    author_kk: field(form, "author_kk"),
    author_ru: field(form, "author_ru"),
    note_kk: field(form, "note_kk"),
    note_ru: field(form, "note_ru"),
    category: asRepertoireCategory(field(form, "category")),
    sort_order: order !== null && Number.isFinite(order) ? order : 0,
    is_active: form.get("is_active") === "on",
    // Empty means "no collective": a piece may sit in the general list rather
    // than being forced into one.
    club_id: field(form, "club_id"),
  };
}

/**
 * Where to go after saving.
 *
 * The form carries it when it was opened from inside a collective, so adding a
 * piece there does not dump it into the general list.
 *
 * Only paths inside the panel are honoured. The value arrives from the browser
 * with the rest of the form, and a server action is a public endpoint: without
 * this check it would be a redirect to anywhere somebody cared to name.
 */
const REPERTOIRE = "/admin/culture-repertoire";

function destination(form: FormData): string {
  const raw = form.get("return_to");
  if (typeof raw !== "string") return REPERTOIRE;
  return /^\/admin(\/[\w/-]*)?$/.test(raw) ? raw : REPERTOIRE;
}

/**
 * The kk/ru pairs this form carries. Reused to fill in whichever side the admin
 * left blank — the form itself shows only the Kazakh input, with the Russian one
 * folded under a collapsed "перевод" section that starts empty on a new record.
 */
const FIELD_PAIRS = [
  ["title_kk", "title_ru"],
  ["author_kk", "author_ru"],
  ["note_kk", "note_ru"],
] as const;

async function fillTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  let filled = data;
  for (const [kk, ru] of FIELD_PAIRS) {
    const [result] = await translateFieldPair([filled], kk, ru);
    filled = result;
  }
  return filled;
}

/**
 * The public page and a collective's own admin and public pages all read
 * repertoire directly, so a change has to reach all of them.
 */
function revalidateRepertoire() {
  revalidatePath("/admin/culture-repertoire");
  revalidatePath("/admin/culture-collectives/[id]", "page");
  revalidatePath("/[locale]/repertoire", "page");
  revalidatePath("/[locale]/collectives/[slug]", "page");
}

export async function createPiece(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillTranslations(payload(form));
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase.from("culture_repertoire").insert({ ...data, organization_id: organizationId });

  if (error) return { error: "Не удалось сохранить произведение." };

  revalidateRepertoire();
  redirect(destination(form));
}

export async function updatePiece(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Произведение не найдено." };

  const data = await fillTranslations(payload(form));
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_repertoire")
    .update({ ...data, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidateRepertoire();
  redirect(destination(form));
}

export async function deletePiece(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const piece = await getCultureRepertoireById(id);
  if (!piece) return { ok: false, error: "Произведение не найдено." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_repertoire").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить произведение." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  revalidateRepertoire();
  return { ok: true };
}
