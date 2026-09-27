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

/**
 * An event's ticket types for the public ticket page: active only, matching what
 * event_ticket_types_public_read already restricts anon to — filtered here too so
 * an admin previewing their own event does not see a hidden type as buyable.
 */
export async function listPublicEventTicketTypes(eventId: string): Promise<EventTicketTypeRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_ticket_types")
    .select(COLUMNS)
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("category");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toRecord);
}

/**
 * Active ticket types for several events in one query — the price range on a
 * showcase card is derived from this, not from calling listPublicEventTicketTypes
 * once per event in a loop.
 */
export async function listPublicEventTicketTypesForEvents(
  eventIds: string[],
): Promise<Map<string, EventTicketTypeRecord[]>> {
  const byEvent = new Map<string, EventTicketTypeRecord[]>();
  if (eventIds.length === 0) return byEvent;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_ticket_types")
    .select(COLUMNS)
    .in("event_id", eventIds)
    .eq("is_active", true);

  if (error || !data) return byEvent;

  for (const row of data as unknown as Row[]) {
    const record = toRecord(row);
    const current = byEvent.get(record.eventId);
    if (current) current.push(record);
    else byEvent.set(record.eventId, [record]);
  }
  return byEvent;
}

export type PriceRange = { kind: "unknown" } | { kind: "free" } | { kind: "range"; min: number; max: number };

/**
 * A price summary from an event's ticket types alone — no query. Free categories
 * (e.g. a children's ticket) are excluded from the paid range rather than pulling
 * its minimum down to 0, mirroring how SeatPicker prices a free seat separately
 * from the paid total.
 */
export function summarizePriceRange(types: EventTicketTypeRecord[]): PriceRange {
  if (types.length === 0) return { kind: "unknown" };

  const paidPrices = types.filter((t) => !t.isFree).map((t) => t.price);
  if (paidPrices.length === 0) return { kind: "free" };

  return { kind: "range", min: Math.min(...paidPrices), max: Math.max(...paidPrices) };
}
