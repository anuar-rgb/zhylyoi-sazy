import { createClient } from "@/lib/supabase/server";

export type EventTicketTypeRecord = {
  id: string;
  eventId: string;
  category: string;
  nameKk: string | null;
  nameRu: string | null;
  /** Numeric(10,2) arrives from supabase-js as a string; parsed here so callers get a number. */
  price: number;
  isFree: boolean;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS = "id, event_id, category, name_kk, name_ru, price, is_free, currency, is_active, created_at, updated_at";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(row: Row): EventTicketTypeRecord {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    category: String(row.category),
    nameKk: str(row.name_kk),
    nameRu: str(row.name_ru),
    price: Number(row.price) || 0,
    isFree: row.is_free === true,
    currency: String(row.currency ?? "KZT"),
    isActive: row.is_active === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * An event's ticket types, for the admin side. RLS scopes this to what the caller
 * may see: staff see their own event's types including deactivated ones, so a
 * hidden type can still be found and turned back on.
 *
 * A failed query returns an empty list rather than throwing, so one bad request
 * cannot take down the page around it.
 */
export async function listEventTicketTypes(eventId: string): Promise<EventTicketTypeRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_ticket_types")
    .select(COLUMNS)
    .eq("event_id", eventId)
    .order("category");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}
