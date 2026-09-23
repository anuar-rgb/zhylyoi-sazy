"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById, type CultureClubImage } from "@/lib/cultureClubs";
import { MEDIA_BUCKET } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** A year, or null. Anything that is not a number is treated as not given. */
function year(form: FormData, name: string): number | null {
  const raw = field(form, name);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The photo widget submits its state as JSON in a hidden input. */
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
 * Column values shared by create and update.
 *
 * No schedule, age range or capacity: those belong to a club that takes children
 * in. A collective has a founding year and possibly a title instead.
 */
function payload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");

  return {
    name: nameKk ?? nameRu,
    name_kk: nameKk,
    name_ru: nameRu,
    direction_kk: field(form, "direction_kk"),
    direction_ru: field(form, "direction_ru"),
    description_kk: field(form, "description_kk"),
    description_ru: field(form, "description_ru"),
    full_text_kk: field(form, "full_text_kk"),
    full_text_ru: field(form, "full_text_ru"),
    manager_name: field(form, "manager_name"),
    contact_phone: field(form, "contact_phone"),
    founded_year: year(form, "founded_year"),
    is_honored: form.get("is_honored") === "on",
    // Kept even when the flag is off, so turning the title back on does not lose
    // the year somebody already looked up.
    honored_since: year(form, "honored_since"),
    is_active: form.get("is_active") === "on",
    images: parseImages(form),
  };
}

/**
 * Four public pages read collectives, not one.
 *
 * The listing, the collective's own page, the rosters grouped by collective, and
 * the page built from the honoured flag. Missing any of them would leave a renamed
 * collective showing its old name somewhere until the next deploy.
 */
function revalidateCollective(slug: string | null) {
  revalidatePath("/admin/culture-collectives");
  revalidatePath("/[locale]/collectives", "page");
  revalidatePath("/[locale]/members", "page");
  revalidatePath("/[locale]/honored", "page");
  if (slug) revalidatePath(`/[locale]/collectives/${slug}`, "page");
}

export async function createCollective(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = payload(form);
  if (!data.name) return { error: "Укажите название хотя бы на одном языке." };

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.name);
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase.from("culture_clubs").insert({
    ...data,
    organization_id: organizationId,
    kind: "creative_collective",
    slug,
  });

  if (error) {
    // The partial unique index on (organization_id, slug) is the likely cause, and
    // a club can hold the address just as easily as another collective.
    return {
      error:
        error.code === "23505"
          ? `Адрес «${slug}» уже занят другим коллективом или кружком.`
          : "Не удалось сохранить коллектив.",
    };
  }

  revalidateCollective(slug);
  redirect("/admin/culture-collectives");
}

export async function updateCollective(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Коллектив не найден." };

  const data = payload(form);
  if (!data.name) return { error: "Укажите название хотя бы на одном языке." };

  const typed = field(form, "slug");
  const slug = typed ? slugify(typed) : slugify(data.name);
  // An address of only punctuation transliterates to nothing; storing that empty
  // string would collide with the next such record under the unique index.
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  // The previous address also needs revalidating, or it keeps serving a page that
  // no longer lives there.
  const before = await getCultureClubById(id);

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_clubs")
    .update({ ...data, slug }, { count: "exact" })
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? `Адрес «${slug}» уже занят другим коллективом или кружком.`
          : "Не удалось сохранить изменения.",
    };
  }

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования этого коллектива." };

  revalidateCollective(slug);
  if (before?.slug && before.slug !== slug) revalidateCollective(before.slug);
  redirect("/admin/culture-collectives");
}

export async function deleteCollective(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const collective = await getCultureClubById(id);
  if (!collective) return { ok: false, error: "Коллектив не найден." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_clubs").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить коллектив." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // The artists are not deleted with it: culture_members.club_id clears instead of
  // cascading, so they stay in the list marked as belonging to nobody. Losing a
  // collective must not silently lose the people in it.

  // Only after the row is gone, and only for files that are actually ours.
  const paths = collective.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateCollective(collective.slug);
  return { ok: true };
}
