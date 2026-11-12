"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { EVENT_LOCKED_MESSAGE, getCultureEventById, isEventLocked, type EventImage } from "@/lib/cultureEvents";
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
import { applyHallSeatsToEvent } from "@/lib/hallDefaults";
import { parseEventPrices, saveEventPrices } from "@/lib/eventPrices";
import { listEventsWithTicketHistory } from "@/lib/bookingsAdmin";
import { deleteBlockedUntil } from "@/lib/eventArchive";
import { formatDateNumeric } from "@/lib/timeZone";
import { notifyMovedEvent, settleCancelledEvent, type CancellationResult } from "@/lib/ticketing/eventChanges";

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
    // Only when the form showed them (the «Билеты» form). The Афиша form leaves them out, and
    // writing null here would quietly take a ticketed event's hall away and stop its sales.
    ...(form.get("ticket_fields") === "1"
      ? { hall_id: field(form, "hall_id"), payment_method_id: field(form, "payment_method_id") }
      : {}),
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
  // A hall_id toggled on or off moves the event between the Афиша admin list
  // and "Билеты" — both need to reflect that, not just whichever one the
  // event ends up in.
  revalidatePath("/admin/tickets");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/afisha", "page");
  revalidatePath("/[locale]/tickets", "page");
  if (slug) revalidatePath(`/[locale]/afisha/${slug}`, "page");
}

/** Афиша no longer lists a ticketed event, so saving one should land back on "Билеты" instead. */
async function redirectAfterSave(hallId: string | null, message: string): Promise<never> {
  await flash(message);
  redirect(hallId ? "/admin/tickets" : "/admin/culture-events");
}

const FOREIGN_PAYMENT_METHOD = "Этот способ оплаты принадлежит другому учреждению.";

/** True when a method is chosen that does not belong to the institution the event is saved for. */
async function isForeignPaymentMethod(methodId: string | null, organizationId: string): Promise<boolean> {
  if (!methodId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_payment_methods")
    .select("organization_id")
    .eq("id", methodId)
    .maybeSingle();
  return !data || data.organization_id !== organizationId;
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
  if (await isForeignPaymentMethod(data.payment_method_id ?? null, organizationId)) return { error: FOREIGN_PAYMENT_METHOD };
  const { prices, error: pricesError } = parseEventPrices(form);
  if (pricesError) return { error: pricesError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("culture_events")
    .insert({
      ...data,
      event_date: data.event_date,
      organization_id: organizationId,
      created_by: user?.id ?? null,
      slug,
    })
    .select("id")
    .single();

  // A new event in a hall starts with the hall's VIP seats, priced by the fields on the form.
  let pricesSaved = true;
  if (!error && created && data.hall_id) {
    await applyHallSeatsToEvent(created.id, data.hall_id);
    pricesSaved = (await saveEventPrices(created.id, prices)) === null;
  }

  if (error) {
    if (error.code === "23505") return { error: `Адрес «${slug}» уже занят другим мероприятием.` };
    // RLS refuses the row itself here, unlike an update it merely filters out.
    if (error.code === "42501") return { error: PUBLISH_DENIED };
    return { error: `Не удалось сохранить: ${error.message}` };
  }

  revalidateEvent(slug);
  return redirectAfterSave(data.hall_id ?? null, pricesSaved ? "Добавлено" : "Добавлено, но цены не сохранились — задайте их в «Билеты»");
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

  // The event’s own institution decides, not the form: the form is just what the browser sent.
  const existing = await getCultureEventById(id);
  // A past or archived event is history: it is looked at and deleted, never changed.
  if (existing && isEventLocked(existing)) return { error: EVENT_LOCKED_MESSAGE };
  if (existing && (await isForeignPaymentMethod(data.payment_method_id ?? null, existing.organizationId))) {
    return { error: FOREIGN_PAYMENT_METHOD };
  }
  // Buyers have to hear about a new date: an event with tickets is moved with «Перенести», not here.
  if (existing && new Date(data.event_date).getTime() !== new Date(existing.eventDate).getTime()) {
    const sold = await listEventsWithTicketHistory([id]);
    if (sold.has(id)) {
      return { error: "На мероприятие уже выданы билеты. Чтобы сменить дату, нажмите «Перенести»: покупатели получат письмо." };
    }
  }
  const { prices, error: pricesError } = parseEventPrices(form);
  if (pricesError) return { error: pricesError };

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

  // Moved to a different hall: its seat categories come along, replacing the old ones, which
  // point at the old hall's seats.
  if ("hall_id" in data && data.hall_id && data.hall_id !== existing?.hallId) {
    await applyHallSeatsToEvent(id, data.hall_id);
  }
  if ("hall_id" in data && data.hall_id) {
    const saveError = await saveEventPrices(id, prices);
    if (saveError) return { error: saveError };
  }

  revalidateEvent(slug);
  // Without the ticket fields on the form the hall is whatever it already was.
  return redirectAfterSave("hall_id" in data ? (data.hall_id ?? null) : (existing?.hallId ?? null), "Изменения сохранены");
}

export async function deleteEvent(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const event = await getCultureEventById(id);
  if (!event) return { ok: false, error: "Мероприятие не найдено." };

  const sold = await listEventsWithTicketHistory([id]);
  const blockedUntil = deleteBlockedUntil(event, sold.has(id));
  if (blockedUntil) return { ok: false, error: keptMessage(blockedUntil) };

  const supabase = await createClient();
  const { error, count } = await supabase.from("culture_events").delete({ count: "exact" }).eq("id", id);

  // The database keeps the same rule, also for an order the check above did not see.
  if (error?.message?.includes("event_has_tickets")) return { ok: false, error: keptMessage(null) };
  if (error) return { ok: false, error: `Не удалось удалить: ${error.message}` };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления этого мероприятия." };

  // Only after the row is gone, and only for files that are actually ours.
  const paths = event.images.map((i) => i.path).filter((p): p is string => p !== null);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  revalidateEvent(event.slug);
  return { ok: true };
}

function keptMessage(until: Date | null): string {
  return (
    "На мероприятие выдавались билеты: заказы хранятся в архиве 5 лет после мероприятия" +
    (until ? `, удалить можно с ${formatDateNumeric(until)}.` : ".") +
    " Чтобы убрать его с сайта, переведите в архив."
  );
}

export type EventChangeResult = { ok: boolean; message: string; notRefunded?: string[] };

const CHANGE_REFUSED: Record<string, string> = {
  not_authenticated: "Не авторизовано.",
  event_not_found: "Мероприятие не найдено или недостаточно прав.",
  already_cancelled: "Мероприятие уже отменено.",
  event_finished: "День мероприятия прошёл: отменить его уже нельзя.",
  reason_too_long: "Причина длиннее 500 знаков.",
  event_cancelled: "Мероприятие отменено, перенести его нельзя.",
  date_in_past: "Новая дата должна быть в будущем.",
  same_date: "Это та же дата.",
};

function refusal(message: string | undefined): string {
  const key = Object.keys(CHANGE_REFUSED).find((code) => message?.includes(code));
  return key ? CHANGE_REFUSED[key] : "Не удалось выполнить действие.";
}

function revalidateEventChange(slug: string | null, id: string) {
  revalidateEvent(slug);
  revalidatePath(`/admin/culture-events/${id}`);
  revalidatePath("/admin/tickets/stats", "layout");
  revalidatePath("/admin/tickets/orders");
  revalidatePath("/[locale]/my-ticket/[token]", "page");
}

function cancellationMessage(result: CancellationResult): EventChangeResult {
  const parts = ["Мероприятие отменено, продажа закрыта."];
  if (result.refunded > 0) parts.push(`Деньги вернулись по ${result.refunded} оплаченным заказам.`);
  if (result.emailed > 0) parts.push(`Писем покупателям отправлено: ${result.emailed}.`);
  if (result.notRefunded.length > 0) {
    parts.push(`Банк пока не вернул деньги по ${result.notRefunded.length} заказам, сайт будет повторять сам.`);
  }
  return { ok: true, message: parts.join(" "), notRefunded: result.notRefunded };
}

/** «Отменить мероприятие»: sales stop, every order is closed and the money goes back. */
export async function cancelEventAction(eventId: string, reason: string): Promise<EventChangeResult> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, message: "Профиль сотрудника не настроен." };
  const event = await getCultureEventById(eventId);
  if (!event) return { ok: false, message: CHANGE_REFUSED.event_not_found };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event", { p_event_id: eventId, p_reason: reason.trim().slice(0, 500) });
  if (error) return { ok: false, message: refusal(error.message) };

  const result = await settleCancelledEvent(eventId);
  revalidateEventChange(event.slug, eventId);
  return cancellationMessage(result);
}

/** «Повторить возврат» on a cancelled event: the refunds and letters that did not go through yet. */
export async function retryEventCancellation(eventId: string): Promise<EventChangeResult> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, message: "Профиль сотрудника не настроен." };
  const event = await getCultureEventById(eventId);
  if (!event?.cancelledAt) return { ok: false, message: CHANGE_REFUSED.event_not_found };

  const result = await settleCancelledEvent(eventId);
  revalidateEventChange(event.slug, eventId);
  if (result.notRefunded.length > 0) {
    return { ok: false, message: `Банк не вернул деньги по заказам: ${result.notRefunded.join(", ")}.`, notRefunded: result.notRefunded };
  }
  return { ok: true, message: result.refunded > 0 ? `Деньги вернулись по ${result.refunded} заказам.` : "Все деньги уже возвращены." };
}

/** «Перенести»: a new date; the tickets stand and every buyer gets them again with that date. */
export async function moveEventAction(eventId: string, newDate: string): Promise<EventChangeResult> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, message: "Профиль сотрудника не настроен." };
  const event = await getCultureEventById(eventId);
  if (!event) return { ok: false, message: CHANGE_REFUSED.event_not_found };
  const iso = dateTimeInputToIso(newDate.trim() || null);
  if (!iso) return { ok: false, message: "Укажите новую дату и время." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_event", { p_event_id: eventId, p_new_date: iso });
  if (error) return { ok: false, message: refusal(error.message) };

  const sent = await notifyMovedEvent(eventId);
  revalidateEventChange(event.slug, eventId);
  const parts = ["Мероприятие перенесено, билеты действуют на новую дату."];
  if (sent.emailed > 0) parts.push(`Писем покупателям отправлено: ${sent.emailed}.`);
  if (sent.emailFailed > 0) parts.push(`Не отправилось ${sent.emailFailed}, сайт повторит сам.`);
  return { ok: true, message: parts.join(" ") };
}
