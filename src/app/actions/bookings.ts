"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateBookingInput = {
  eventId: string;
  buyerName: string;
  buyerPhone: string;
  seatIds: string[];
};

export type CreateBookingResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: "missing" | "no_seats" | "unavailable" | "seat_taken" | "failed" };

/**
 * The only way a booking is ever created. Everything that matters — price,
 * expiry, "is this seat still free" — is decided inside the create_booking
 * Postgres function, in one transaction; this action only forwards the seat ids
 * the guest picked and translates whatever comes back into a message the form
 * can show. It never computes or trusts a price or a seat's availability itself.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const buyerName = input.buyerName.trim();
  const buyerPhone = input.buyerPhone.trim();
  if (!buyerName || !buyerPhone) return { ok: false, error: "missing" };
  if (input.seatIds.length === 0) return { ok: false, error: "no_seats" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_event_id: input.eventId,
    p_buyer_name: buyerName,
    p_buyer_phone: buyerPhone,
    p_seat_ids: input.seatIds,
  });

  if (error) {
    // The partial unique index on (event_id, seat_id) where released_at is null is
    // the "someone else just took this seat" case — the same shape as the slug
    // conflicts elsewhere in the admin, just surfacing from a function instead of
    // a plain insert.
    if (error.code === "23505") return { ok: false, error: "seat_taken" };
    if (error.message?.includes("seat_not_available")) return { ok: false, error: "unavailable" };
    if (error.message?.includes("event_has_no_hall")) return { ok: false, error: "unavailable" };
    if (error.message?.includes("event_not_found")) return { ok: false, error: "unavailable" };
    return { ok: false, error: "failed" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.access_token) return { ok: false, error: "failed" };

  return { ok: true, accessToken: row.access_token as string };
}
