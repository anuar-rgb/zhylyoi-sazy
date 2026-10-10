"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureEventById } from "@/lib/cultureEvents";
import { applyHallSeatsToEvent } from "@/lib/hallDefaults";
import { parseEventPrices, saveEventPrices } from "@/lib/eventPrices";
import { STANDARD, normalizeCategory } from "@/lib/seatCategories";

export type FormState = { error: string | null };

function revalidateTickets(eventId: string) {
  revalidatePath(`/admin/culture-events/${eventId}/tickets`);
}

/** «Цены билетов»: one price per seat category, the same fields as on the event's form. */
export async function updateEventPrices(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const eventId = form.get("event_id");
  if (typeof eventId !== "string" || !eventId) return { error: "Мероприятие не найдено." };

  const { prices, error } = parseEventPrices(form);
  if (error) return { error };
  const saveError = await saveEventPrices(eventId, prices);
  if (saveError) return { error: saveError };

  revalidateTickets(eventId);
  revalidatePath("/[locale]/tickets", "page");
  return { error: null };
}

/** «Взять места из зала»: the event's seat categories become the hall's again. Prices stay. */
export async function takeHallSeats(eventId: string): Promise<{ ok: boolean; seats: number }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, seats: 0 };

  const event = await getCultureEventById(eventId);
  if (!event?.hallId) return { ok: false, seats: 0 };

  const result = await applyHallSeatsToEvent(eventId, event.hallId);
  if (result.ok) revalidateTickets(eventId);
  return result;
}

/**
 * category === null resets the selected seats back to "standard" for this
 * event by deleting their override row entirely — there is no "standard"
 * row to write, absence already means that (see event_seat_categories).
 */
export async function setEventSeatCategory(
  eventId: string,
  seatIds: string[],
  category: string | null
): Promise<{ ok: boolean }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false };
  if (seatIds.length === 0) return { ok: true };

  const supabase = await createClient();

  // Choosing Стандарт is the same as resetting: no override row means Стандарт.
  if (category !== null && normalizeCategory(category) === STANDARD) category = null;

  if (category === null) {
    const { error } = await supabase
      .from("event_seat_categories")
      .delete()
      .eq("event_id", eventId)
      .in("seat_id", seatIds);
    if (!error) revalidateTickets(eventId);
    return { ok: !error };
  }

  // «вип» and «VIP» are one category; so are «Ложа» and «ложа».
  const normalized = normalizeCategory(category);
  if (!normalized) return { ok: false };
  const rows = seatIds.map((seatId) => ({ event_id: eventId, seat_id: seatId, category: normalized }));
  const { error } = await supabase.from("event_seat_categories").upsert(rows, { onConflict: "event_id,seat_id" });

  if (!error) revalidateTickets(eventId);
  return { ok: !error };
}
