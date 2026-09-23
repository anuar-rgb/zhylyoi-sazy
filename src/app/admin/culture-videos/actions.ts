"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureVideoById } from "@/lib/cultureVideos";
import { youtubeId } from "@/lib/youtube";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Column values shared by create and update, minus whatever identifies the source. */
function payload(form: FormData) {
  const titleKk = field(form, "title_kk");
  const titleRu = field(form, "title_ru");

  const orderRaw = field(form, "sort_order");
  const order = orderRaw !== null ? Number.parseInt(orderRaw, 10) : null;

  return {
    title: titleKk ?? titleRu,
    title_kk: titleKk,
    title_ru: titleRu,
    description_kk: field(form, "description_kk"),
    description_ru: field(form, "description_ru"),
    venue_kk: field(form, "venue_kk"),
    venue_ru: field(form, "venue_ru"),
    sort_order: order !== null && Number.isFinite(order) ? order : 0,
    is_active: form.get("is_active") === "on",
  };
}

/** The public page reads the table directly, so a change has to reach it too. */
function revalidateVideos() {
  revalidatePath("/admin/culture-videos");
  revalidatePath("/[locale]/video", "page");
}

export async function createVideo(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = payload(form);
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };

  // Resolved here, once, rather than on every render. A link that yields nothing is
  // refused with an explanation instead of stored as a video that will never play.
  const link = field(form, "youtube_url");
  if (!link) return { error: "Вставьте ссылку на видео в YouTube." };

  const id = youtubeId(link);
  if (!id) return { error: "Это не похоже на ссылку YouTube. Скопируйте адрес из строки браузера." };

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("culture_videos")
    .insert({ ...data, organization_id: organizationId, kind: "youtube", youtube_id: id, file_path: null });

  if (error) return { error: "Не удалось сохранить видео." };

  revalidateVideos();
  redirect("/admin/culture-videos");
}

export async function updateVideo(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Видео не найдено." };

  const existing = await getCultureVideoById(id);
  if (!existing) return { error: "Видео не найдено." };

  const data = payload(form);
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };

  // A file-backed recording keeps its file: the form does not offer to change it,
  // because there is nowhere in the panel to upload a replacement.
  let source: Record<string, unknown> = {};
  if (existing.kind === "youtube") {
    const link = field(form, "youtube_url");
    if (!link) return { error: "Вставьте ссылку на видео в YouTube." };

    const videoId = youtubeId(link);
    if (!videoId) return { error: "Это не похоже на ссылку YouTube. Скопируйте адрес из строки браузера." };

    source = { youtube_id: videoId };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_videos")
    .update({ ...data, ...source, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };

  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования." };

  revalidateVideos();
  redirect("/admin/culture-videos");
}

export async function deleteVideo(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const video = await getCultureVideoById(id);
  if (!video) return { ok: false, error: "Видео не найдено." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_videos").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить видео." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // Nothing to clean up in Storage: a YouTube row owns no file, and a file row
  // points at a .mp4 inside the application, which this panel did not put there.
  revalidateVideos();
  return { ok: true };
}
