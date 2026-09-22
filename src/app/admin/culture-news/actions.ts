"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureNewsById, type NewsImage } from "@/lib/cultureNews";
import { toPublishStatus } from "@/lib/publishStatus";
import { dateTimeInputToIso } from "@/lib/eventFields";
import { MEDIA_BUCKET } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export type FormState = { error: string | null };

/** Kept as a readable fallback: RLS still has the final say on every write. */
const DENIED = "Недостаточно прав для этого изменения.";

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The images widget submits its state as JSON in a hidden input. */
function parseImages(form: FormData): NewsImage[] {
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
 * `title` is the NOT NULL service column, filled from whichever translation exists.
 * The table also insists on at least one of the content columns, which is why an
 * empty text is rejected before the statement is sent.
 */
function payload(form: FormData) {
  const titleKk = field(form, "title_kk");
  const titleRu = field(form, "title_ru");

  return {
    title: titleKk ?? titleRu,
    title_kk: titleKk,
    title_ru: titleRu,
    tag_kk: field(form, "tag_kk"),
    tag_ru: field(form, "tag_ru"),
    excerpt_kk: field(form, "excerpt_kk"),
    excerpt_ru: field(form, "excerpt_ru"),
    content_kk: field(form, "content_kk"),
    content_ru: field(form, "content_ru"),
    published_at: dateTimeInputToIso(field(form, "published_at")),
    status: toPublishStatus(form.get("status")),
    images: parseImages(form),
  };
}

/** The news pages read the table directly, so a change has to reach them. */
function revalidateNews(slug: string | null) {
  revalidatePath("/admin/culture-news");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/news", "page");
  if (slug) revalidatePath(`/[locale]/news/${slug}`, "page");
}

/** Shared checks; returns the prepared row or the message to show. */
function validate(form: FormData): { data: ReturnType<typeof payload>; slug: string } | { error: string } {
  const data = payload(form);
  if (!data.title) return { error: "Укажите заголовок хотя бы на одном языке." };
  if (!data.content_kk && !data.content_ru) return { error: "Напишите текст новости хотя бы на одном языке." };

  // Published without a date would sort to the bottom and show no date at all.
  if (data.status === "published" && !data.published_at) {
    return { error: "Для публикации укажите дату." };
  }

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.title);
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  return { data, slug };
}

export async function createNews(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const checked = validate(form);
  if ("error" in checked) return { error: checked.error };

  // A platform admin belongs to no institution, so fall back to the site's own.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("culture_news").insert({
    ...checked.data,
    organization_id: organizationId,
    created_by: user?.id ?? null,
    slug: checked.slug,
  });

  if (error) {
    if (error.code === "23505") return { error: `Адрес «${checked.slug}» уже занят другой новостью.` };
    if (error.code === "42501") return { error: DENIED };
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidateNews(checked.slug);
  redirect("/admin/culture-news");
}

export async function updateNews(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Не указано, какую новость сохранять." };

  const checked = validate(form);
  if ("error" in checked) return { error: checked.error };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_news")
    .update({ ...checked.data, slug: checked.slug }, { count: "exact" })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `Адрес «${checked.slug}» уже занят другой новостью.` };
    if (error.code === "42501") return { error: DENIED };
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  // RLS filters rows instead of refusing the statement, so a denied edit changes
  // nothing and reports no error. Without this check it would look like success.
  if (count === 0) return { error: DENIED };

  revalidateNews(checked.slug);
  redirect("/admin/culture-news");
}

export async function deleteNews(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const item = await getCultureNewsById(id);
  if (!item) return { ok: false, error: "Новость не найдена." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_news").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: `Не удалось удалить: ${error.message}` };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления этой новости." };

  // Only after the row is gone, and only for files that are actually ours.
  const paths = item.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateNews(item.slug);
  return { ok: true };
}
