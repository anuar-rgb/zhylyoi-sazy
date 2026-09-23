"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById, type CultureClubImage } from "@/lib/cultureClubs";
import { MEDIA_BUCKET } from "@/lib/storage";
import { slugify } from "@/lib/slug";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The images widget submits its state as JSON in a hidden input. */
function parseImages(form: FormData): CultureClubImage[] {
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
 * Builds the column values shared by create and update.
 *
 * `name` is the NOT NULL service column. It is never asked for in the form —
 * filling it from whichever translation exists keeps the form to one name per
 * language while leaving the column honest.
 */
function payload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");
  const name = nameKk ?? nameRu;

  const capacityRaw = field(form, "capacity");
  const capacity = capacityRaw !== null ? Number.parseInt(capacityRaw, 10) : null;

  return {
    name,
    name_kk: nameKk,
    name_ru: nameRu,
    direction_kk: field(form, "direction_kk"),
    direction_ru: field(form, "direction_ru"),
    description_kk: field(form, "description_kk"),
    description_ru: field(form, "description_ru"),
    full_text_kk: field(form, "full_text_kk"),
    full_text_ru: field(form, "full_text_ru"),
    schedule_kk: field(form, "schedule_kk"),
    schedule_ru: field(form, "schedule_ru"),
    age_range: field(form, "age_range"),
    manager_name: field(form, "manager_name"),
    contact_phone: field(form, "contact_phone"),
    capacity: capacity !== null && Number.isFinite(capacity) ? capacity : null,
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
  ["direction_kk", "direction_ru"],
  ["description_kk", "description_ru"],
  ["full_text_kk", "full_text_ru"],
  ["schedule_kk", "schedule_ru"],
] as const;

async function fillTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  let filled = data;
  for (const [kk, ru] of FIELD_PAIRS) {
    const [result] = await translateFieldPair([filled], kk, ru);
    filled = result;
  }
  return filled;
}

/** Both public pages read clubs directly, so a change has to reach them too. */
function revalidateClub(slug: string | null) {
  revalidatePath("/admin/culture-clubs");
  revalidatePath("/[locale]/collectives", "page");
  if (slug) revalidatePath(`/[locale]/clubs/${slug}`, "page");
}

export async function createClub(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillTranslations(payload(form));
  if (!data.name) return { error: "Укажите название хотя бы на одном языке." };

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.name);
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  // A platform admin belongs to no institution, so fall back to the site's own.
  // With several institutions this becomes a picker in the form.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase.from("culture_clubs").insert({
    ...data,
    organization_id: organizationId,
    kind: "club",
    slug,
  });

  if (error) {
    // The partial unique index on (organization_id, slug) is the likely cause.
    return {
      error: error.code === "23505" ? `Адрес «${slug}» уже занят другим кружком.` : "Не удалось сохранить кружок.",
    };
  }

  revalidateClub(slug);
  redirect("/admin/culture-clubs");
}

export async function updateClub(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Кружок не найден." };

  const data = await fillTranslations(payload(form));
  if (!data.name) return { error: "Укажите название хотя бы на одном языке." };

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.name);
  // An address of only punctuation transliterates to nothing; storing that empty
  // string would collide with the next such record under the unique index.
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  // The previous slug also needs revalidating, or the old address keeps serving
  // a page that no longer exists there.
  const before = await getCultureClubById(id);

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_clubs")
    .update({ ...data, slug }, { count: "exact" })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505" ? `Адрес «${slug}» уже занят другим кружком.` : "Не удалось сохранить изменения.",
    };
  }

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования этого кружка." };

  revalidateClub(slug);
  if (before?.slug && before.slug !== slug) revalidateClub(before.slug);
  redirect("/admin/culture-clubs");
}

export async function deleteClub(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const club = await getCultureClubById(id);
  if (!club) return { ok: false, error: "Кружок не найден." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_clubs").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить кружок." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // Only after the row is gone, and only for files that are actually ours —
  // seeded images point at Pexels and have no path.
  const paths = club.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateClub(club.slug);
  return { ok: true };
}
