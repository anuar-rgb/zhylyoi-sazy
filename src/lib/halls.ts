import { createClient } from "@/lib/supabase/server";

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
  rowLabel: string;
  seatNumber: number;
  category: string;
  isActive: boolean;
  createdAt: string;
};

const HALL_COLUMNS = "id, organization_id, name_kk, name_ru, total_capacity, is_active, created_at, updated_at";
const SEAT_COLUMNS = "id, hall_id, row_label, seat_number, category, is_active, created_at";

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
  return a.rowLabel.localeCompare(b.rowLabel, undefined, { numeric: true }) || a.seatNumber - b.seatNumber;
}

/** A hall's seats, ordered by row then seat number. */
export async function listHallSeats(hallId: string): Promise<HallSeatRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("hall_seats").select(SEAT_COLUMNS).eq("hall_id", hallId);

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toSeat).sort(byRowThenSeat);
}

/**
 * A hall's seats for the public seat map: active only. RLS's hall_seats_public_read
 * only checks the hall's own is_active flag, not the seat's — a hidden individual
 * seat (broken chair, aisle) would otherwise still show up to a visitor. Filtered
 * here the same way listPublicCultureMembers filters is_active on top of a broader
 * RLS read policy.
 */
export async function listPublicHallSeats(hallId: string): Promise<HallSeatRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hall_seats")
    .select(SEAT_COLUMNS)
    .eq("hall_id", hallId)
    .eq("is_active", true);

  if (error || !data) return [];
  return (data as unknown as Row[]).map(toSeat).sort(byRowThenSeat);
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
