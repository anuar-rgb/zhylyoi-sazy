"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { translateFieldPair } from "@/lib/autoTranslate";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function revalidateTickets(eventId: string) {
  revalidatePath(`/admin/culture-events/${eventId}/tickets`);
}

/**
 * Builds the column values shared by create and update.
 *
 * price is forced to 0 the moment is_free is checked, regardless of what is still
 * sitting in the price field — the check constraint would reject a stray non-zero
 * price on a free ticket, and this way the admin never has to remember to clear it.
 */
function payload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");
  const category = field(form, "category");
  const isFree = form.get("is_free") === "on";
  const priceRaw = field(form, "price");
  const price = isFree ? 0 : priceRaw !== null ? Number.parseFloat(priceRaw) : null;

  return {
    category,
    name_kk: nameKk,
    name_ru: nameRu,
    is_free: isFree,
    price,
  };
}

async function fillNameTranslations(data: ReturnType<typeof payload>): Promise<ReturnType<typeof payload>> {
  const [filled] = await translateFieldPair([data], "name_kk", "name_ru");
  return filled;
}

function validate(data: ReturnType<typeof payload>): string | null {
  if (!data.category) return "Выберите категорию.";
  if (!data.name_kk && !data.name_ru) return "Укажите название билета хотя бы на одном языке.";
  if (!data.is_free && (data.price === null || !Number.isFinite(data.price) || data.price <= 0)) {
    return "Укажите цену больше 0 или отметьте «Бесплатно».";
  }
  return null;
}

export async function createTicketType(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const eventId = field(form, "event_id");
  if (!eventId) return { error: "Мероприятие не найдено." };

  const data = await fillNameTranslations(payload(form));
  const validationError = validate(data);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("event_ticket_types").insert({ ...data, event_id: eventId });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? `Цена для категории «${data.category}» уже задана — измените существующий тип билета вместо создания нового.`
          : "Не удалось создать тип билета.",
    };
  }

  revalidateTickets(eventId);
  return { error: null };
}

export async function updateTicketType(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  const eventId = field(form, "event_id");
  if (!id || !eventId) return { error: "Тип билета не найден." };

  const data = await fillNameTranslations(payload(form));
  const validationError = validate(data);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error, count } = await supabase.from("event_ticket_types").update(data, { count: "exact" }).eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? `Цена для категории «${data.category}» уже задана другим типом билета.`
          : "Не удалось сохранить изменения.",
    };
  }
  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования этого типа билета." };

  revalidateTickets(eventId);
  return { error: null };
}

export async function setTicketTypeActive(id: string, eventId: string, isActive: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error, count } = await supabase
    .from("event_ticket_types")
    .update({ is_active: isActive }, { count: "exact" })
    .eq("id", id);

  if (!error && count === 1) revalidateTickets(eventId);
  return { ok: !error && count === 1 };
}
