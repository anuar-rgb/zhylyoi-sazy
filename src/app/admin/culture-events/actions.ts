"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureEventById, type EventImage } from "@/lib/cultureEvents";
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  dateTimeInputToIso,
  type EventCategory,
  type EventStatus,
} from "@/lib/eventFields";
import { MEDIA_BUCKET } from "@/lib/storage";
import { slugify } from "@/lib/slug";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null };

/** Kept as a readable fallback: RLS still has the final say on every write. */
const PUBLISH_DENIED = "Недостаточно прав для этого изменения.";

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** The images widget submits its state as JSON in a hidden input. */
function parseImages(form: FormData): EventImage[] {
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

/** Only the categories the poster page knows; anything else is dropped. */
function parseCategories(form: FormData): EventCategory[] {
  return form
    .getAll("categories")
    .filter((c): c is string => typeof c === "string")
    .filter((c): c is EventCategory => EVENT_CATEGORIES.includes(c as EventCategory));
}

function parseStatus(form: FormData): EventStatus {
  const value = form.get("status");
  return EVENT_STATUSES.includes(value as EventStatus) ? (value as EventStatus) : "draft";
}

/**
 * Builds the column values shared by create and update.
 *
 * `title` is the NOT NULL service column. It is never asked for in the form —
 * filling it from whichever translation exists keeps the form to one title per
 * language while leaving the column honest.
 */
function payload(form: FormData) {
  const titleKk = field(form, "title_kk");
  const titleRu = field(form, "title_ru");

  return {
    title: titleKk ?? titleRu,
    title_kk: titleKk,
    title_ru: titleRu,
    description_kk: field(form, "description_kk"),
    description_ru: field(form, "description_ru"),
    full_text_kk: field(form, "full_text_kk"),
    full_text_ru: field(form, "full_text_ru"),
    location_kk: field(form, "location_kk"),
    location_ru: field(form, "location_ru"),
    event_date: dateTimeInputToIso(field(form, "event_date")),
    end_date: dateTimeInputToIso(field(form, "end_date")),
    categories: parseCategories(form),
    organizer_kk: field(form, "organizer_kk"),
    organizer_ru: field(form, "organizer_ru"),
    age_limit: field(form, "age_limit"),
    status: parseStatus(form),
    images: parseImages(form),
  };
}

/**
 * The kk/ru pairs this form carries. Reused to fill in whichever side the admin
 * left blank — the form itself shows only the Kazakh input, with the Russian one
 * folded under a collapsed "перевод" section that starts empty on a new record.
 */
const FIELD_PAIRS = [
  ["title_kk", "title_ru"],
  ["description_kk", "description_ru"],
  ["full_text_kk", "full_text_ru"],
  ["location_kk", "location_ru"],
  ["organizer_kk", "organizer_ru"],
] as const;

async function fillTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  let filled = data;
  for (const [kk, ru] of FIELD_PAIRS) {
    const [result] = await translateFieldPair([filled], kk, ru);
    filled = result;
  }
  return filled;
}

/** The poster and the front page read events directly, so a change has to reach them. */
function revalidateEvent(slug: string | null) {
  revalidatePath("/admin/culture-events");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/afisha", "page");
  if (slug) revalidatePath(`/[locale]/afisha/${slug}`, "page");
}

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillTranslations(payload(form));
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };
  if (!data.event_date) return { error: "Укажите дату и время начала." };

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.title);
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  // A platform admin belongs to no institution, so fall back to the site's own.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("culture_events").insert({
    ...data,
    event_date: data.event_date,
    organization_id: organizationId,
    created_by: user?.id ?? null,
    slug,
  });

  if (error) {
    if (error.code === "23505") return { error: `Адрес «${slug}» уже занят другим мероприятием.` };
    // RLS refuses the row itself here, unlike an update it merely filters out.
    if (error.code === "42501") return { error: PUBLISH_DENIED };
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidateEvent(slug);
  redirect("/admin/culture-events");
}

export async function updateEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Не указано, какое мероприятие сохранять." };

  const data = await fillTranslations(payload(form));
  if (!data.title) return { error: "Укажите название хотя бы на одном языке." };
  if (!data.event_date) return { error: "Укажите дату и время начала." };

  const typed = field(form, "slug");
  // Applied to a typed address too: it ends up in a URL people copy and send.
  const slug = typed ? slugify(typed) : slugify(data.title);
  // An address of only punctuation transliterates to nothing; storing that empty
  // string would collide with the next such record under the unique index.
  if (!slug) return { error: "Не удалось составить адрес страницы. Заполните поле «Адрес»." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("culture_events")
    .update({ ...data, event_date: data.event_date, slug }, { count: "exact" })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `Адрес «${slug}» уже занят другим мероприятием.` };
    // RLS refuses the row itself here, unlike an update it merely filters out.
    if (error.code === "42501") return { error: PUBLISH_DENIED };
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  // RLS filters rows instead of refusing the statement, so a denied edit changes
  // nothing and reports no error. Without this check it would look like success.
  if (count === 0) {
    return { error: PUBLISH_DENIED };
  }

  revalidateEvent(slug);
  redirect("/admin/culture-events");
}

export async function deleteEvent(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const event = await getCultureEventById(id);
  if (!event) return { ok: false, error: "Мероприятие не найдено." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_events").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: `Не удалось удалить: ${error.message}` };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления этого мероприятия." };

  // Only after the row is gone, and only for files that are actually ours.
  const paths = event.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateEvent(event.slug);
  return { ok: true };
}
