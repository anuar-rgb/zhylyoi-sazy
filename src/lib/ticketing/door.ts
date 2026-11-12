import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What the door sees of an event's hall: which seats are already inside, which are out of order,
 * and how many tickets are valid. Read by the server's key after the page checked the person
 * (getDoorIdentity): a controller has no read rights on orders. No buyer, no order, no money here.
 */
export type DoorState = {
  /** Seats whose ticket was scanned at the door. */
  entered: string[];
  /** Seats closed as «Неисправно» for this event. */
  broken: string[];
  /** Valid tickets (confirmed, not returned), entered or not. */
  sold: number;
};

export async function getDoorState(eventId: string): Promise<DoorState> {
  const empty: DoorState = { entered: [], broken: [], sold: 0 };
  const admin = createAdminClient();
  if (!admin) return empty;
  const [{ data: items }, { data: blocks }] = await Promise.all([
    admin
      .from("booking_items")
      .select("seat_id, checked_in_at, bookings!inner(status)")
      .eq("event_id", eventId)
      .is("released_at", null)
      .eq("bookings.status", "confirmed"),
    admin.from("event_seat_blocks").select("seat_id").eq("event_id", eventId).eq("kind", "broken"),
  ]);
  const rows = (items ?? []) as { seat_id: string | null; checked_in_at: string | null }[];
  return {
    entered: rows.filter((row) => row.checked_in_at && row.seat_id).map((row) => String(row.seat_id)),
    broken: (blocks ?? []).map((row) => String((row as { seat_id: string }).seat_id)),
    sold: rows.length,
  };
}

/** True when the event belongs to this institution: a door checks only its own events. */
export async function isOwnEvent(eventId: string, organizationId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("culture_events").select("organization_id").eq("id", eventId).maybeSingle();
  return data?.organization_id === organizationId;
}
