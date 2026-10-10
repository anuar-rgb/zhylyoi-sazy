import { createClient } from "@/lib/supabase/server";
import { categoryLabel, categoryOptions } from "@/lib/seatCategories";
import { listHallCategories } from "@/lib/halls";
import { listEventSeatCategories } from "@/lib/eventSeatCategories";
import type { EventTicketTypeRecord } from "@/lib/eventTicketTypes";

/** category -> price (0 = free), or null: the category is not on sale for this event. */
export type EventPrices = Map<string, number | null>;

/**
 * The categories an event prices: those of its hall (Стандарт, VIP and the hall's own), those
 * this event marked on its own seat map, and any it already has a price for.
 */
export async function listEventPriceCategories(
  eventId: string,
  hallId: string,
  ticketTypes: EventTicketTypeRecord[]
): Promise<string[]> {
  const [hall, event] = await Promise.all([listHallCategories(hallId), listEventSeatCategories(eventId)]);
  return categoryOptions([...hall, ...event, ...ticketTypes.filter((t) => t.isActive).map((t) => t.category)]);
}

/** The event's prices as the price fields show them: active ticket types only. */
export function pricesOf(ticketTypes: EventTicketTypeRecord[]): Record<string, number> {
  return Object.fromEntries(ticketTypes.filter((t) => t.isActive).map((t) => [t.category, t.isFree ? 0 : t.price]));
}

/**
 * Reads the "price:<category>" fields of a form. An empty field is null (not on sale), a number
 * from 0 is the price (0 = free). Checked before anything is saved, so a typo does not leave an
 * event half-saved.
 */
export function parseEventPrices(form: FormData): { prices: EventPrices; error: string | null } {
  const prices: EventPrices = new Map();
  for (const [name, value] of form.entries()) {
    if (!name.startsWith("price:") || typeof value !== "string") continue;
    const category = name.slice("price:".length);
    const raw = value.trim().replace(",", ".");
    if (raw === "") {
      prices.set(category, null);
      continue;
    }
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      return { prices, error: `Цена для «${categoryLabel(category)}» должна быть числом от 0 (0 — бесплатно).` };
    }
    prices.set(category, Math.round(price * 100) / 100);
  }
  return { prices, error: null };
}

/**
 * Writes the event's price per category into event_ticket_types: one ticket type per category,
 * named after it. A category left empty is switched off rather than deleted — bookings already
 * point at its ticket type. Returns an error message, or null.
 */
export async function saveEventPrices(eventId: string, prices: EventPrices): Promise<string | null> {
  if (prices.size === 0) return null;
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("event_ticket_types")
    .select("id, category")
    .eq("event_id", eventId);
  if (readError) return "Не удалось сохранить цены.";
  const idOf = new Map((existing ?? []).map((row) => [row.category as string, row.id as string]));

  for (const [category, price] of prices) {
    const id = idOf.get(category);
    if (price === null) {
      if (id) {
        const { error } = await supabase.from("event_ticket_types").update({ is_active: false }).eq("id", id);
        if (error) return "Не удалось сохранить цены.";
      }
      continue;
    }
    const values = {
      price,
      is_free: price === 0,
      is_active: true,
      name_ru: categoryLabel(category, "ru"),
      name_kk: categoryLabel(category, "kk"),
    };
    const { error } = id
      ? await supabase.from("event_ticket_types").update(values).eq("id", id)
      : await supabase.from("event_ticket_types").insert({ ...values, event_id: eventId, category });
    if (error) return "Не удалось сохранить цены.";
  }
  return null;
}
