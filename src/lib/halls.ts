import { createClient } from "@/lib/supabase/server";
import { sectionOrder, toSection, type HallSection } from "@/lib/hallSections";

export type HallRecord = {
  id: string;
  organizationId: string;
  nameKk: string | null;
  nameRu: string | null;
  totalCapacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HallSeatRecord = {
  id: string;
  hallId: string;
  /** parter, left, right or balcony; rows and seats are numbered within it. */
  section: HallSection;
  rowLabel: string;
  seatNumber: number;
  category: string;
  isActive: boolean;
  createdAt: string;
};

const HALL_COLUMNS = "id, organization_id, name_kk, name_ru, total_capacity, is_active, created_at, updated_at";
const BASE_SEAT_COLUMNS = "id, hall_id, row_label, seat_number, category, is_active, created_at";
const SEAT_COLUMNS = `${BASE_SEAT_COLUMNS}, section`;
/** Postgres "undefined_column": the hall_seats.section migration has not been run yet. */
const UNDEFINED_COLUMN = "42703";

type Row = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toHall(row: Row): HallRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    nameKk: str(row.name_kk),
    nameRu: str(row.name_ru),
    totalCapacity: typeof row.total_capacity === "number" ? row.total_capacity : 0,
    isActive: row.is_active === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toSeat(row: Row): HallSeatRecord {
  return {
    id: String(row.id),
    hallId: String(row.hall_id),
    section: toSection(row.section),
    rowLabel: String(row.row_label),
    seatNumber: typeof row.seat_number === "number" ? row.seat_number : 0,
    category: String(row.category ?? "standard"),
    isActive: row.is_active === true,
    createdAt: String(row.created_at),
  };
}

/**
 * Halls the caller may see. RLS decides the scope: staff get their own
 * institution's rows including hidden ones, an anonymous caller gets none here
 * (this function is only ever called from the admin side).
 *
 * A failed query returns an empty list rather than throwing, so one bad request
 * cannot take down the page around it.
 */
export async function listHalls(): Promise<HallRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("halls").select(HALL_COLUMNS).order("name_ru");

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toHall);
}

/** One hall by id, for the edit form. Null when missing or not visible to the caller. */
export async function getHallById(id: string): Promise<HallRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("halls").select(HALL_COLUMNS).eq("id", id).maybeSingle();

  if (error || !data) return null;
  return toHall(data as unknown as Row);
}

/**
 * Sorts seats by row then seat number, treating row_label's digit runs as
 * numbers rather than text — Postgres's own ORDER BY on the text column would
 * put row "10" before row "2". Rows spelled as letters (A, B, ... Z, AA, AB, …)
 * still compare alphabetically, since localeCompare's numeric mode only changes
 * how embedded digits compare, not letters.
 */
function byRowThenSeat(a: HallSeatRecord, b: HallSeatRecord): number {
  return (
    sectionOrder(a.section) - sectionOrder(b.section) ||
    a.rowLabel.localeCompare(b.rowLabel, undefined, { numeric: true }) ||
    a.seatNumber - b.seatNumber
  );
}

/**
 * Seats of one hall, read with their section; before the section migration has been run the
 * column does not exist yet and every seat reads as the parter, as it was.
 */
async function readSeats(hallId: string, activeOnly: boolean): Promise<HallSeatRecord[]> {
  const supabase = await createClient();
  const read = (columns: string) => {
    const query = supabase.from("hall_seats").select(columns).eq("hall_id", hallId);
    return activeOnly ? query.eq("is_active", true) : query;
  };
  let { data, error } = await read(SEAT_COLUMNS);
  if (error?.code === UNDEFINED_COLUMN) ({ data, error } = await read(BASE_SEAT_COLUMNS));
  if (error || !data) return [];
  return (data as unknown as Row[]).map(toSeat).sort(byRowThenSeat);
}

/** A hall's seats, ordered by section, then row, then seat number. */
export async function listHallSeats(hallId: string): Promise<HallSeatRecord[]> {
  return readSeats(hallId, false);
}

/**
 * A hall's seats for the public seat map: active only. RLS's hall_seats_public_read
 * only checks the hall's own is_active flag, not the seat's — a hidden individual
 * seat (broken chair, aisle) would otherwise still show up to a visitor. Filtered
 * here the same way listPublicCultureMembers filters is_active on top of a broader
 * RLS read policy.
 */
export async function listPublicHallSeats(hallId: string): Promise<HallSeatRecord[]> {
  return readSeats(hallId, true);
}

/**
 * The section of each of these seats (seat id -> section), for places that get a seat's row
 * and number from a database function that predates sections: a booking, a ticket, the door
 * scanner. A seat not found, or a database without sections yet, reads as the parter.
 */
export async function getSeatSections(seatIds: string[]): Promise<Map<string, HallSection>> {
  if (seatIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("hall_seats").select("id, section").in("id", seatIds);
  if (error || !data) return new Map();
  return new Map((data as { id: string; section: string }[]).map((row) => [row.id, toSection(row.section)]));
}

/**
 * The hall's default price per seat category (category -> price, 0 = free).
 *
 * available is false when the table cannot be read, typically before the
 * hall_category_prices migration has been run; the page then says so instead of showing
 * empty prices that would look like "none set".
 */
export async function listHallCategoryPrices(hallId: string): Promise<{ available: boolean; prices: Map<string, number> }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("hall_category_prices").select("category, price").eq("hall_id", hallId);
  if (error || !data) return { available: false, prices: new Map() };
  return {
    available: true,
    prices: new Map((data as { category: string; price: number | string }[]).map((row) => [row.category, Number(row.price)])),
  };
}

/**
 * The distinct seat categories actually present in a hall, sorted.
 *
 * Used by the ticket-type form on an event so staff can only price categories
 * that exist in the hall the event is in — category is free text in hall_seats,
 * nothing in the database stops a typo from creating a category the seat map
 * never had.
 */
export async function listHallSeatCategories(hallId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hall_seats")
    .select("category")
    .eq("hall_id", hallId)
    .eq("is_active", true);

  if (error || !data) return [];
  const categories = new Set((data as unknown as { category: string }[]).map((row) => row.category));
  return [...categories].sort();
}
