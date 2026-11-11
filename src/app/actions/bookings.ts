"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmail, normalizeEmail } from "@/lib/email";
import { sendTicketsEmail } from "@/lib/mail/tickets";

export type CreateBookingInput = {
  eventId: string;
  /** Where the tickets are sent. The only thing asked of the buyer. */
  buyerEmail: string;
  seatIds: string[];
  /** The page's language: the email and the PDF come in it. */
  locale: "kk" | "ru";
  /** The buyer ticked the consent to personal data processing. */
  consent: boolean;
};

export type CreateBookingResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: "email" | "consent" | "no_seats" | "unavailable" | "seat_taken" | "failed" };

/**
 * The only way a booking is ever created. Everything that matters — price,
 * expiry, "is this seat still free" — is decided inside the create_booking
 * Postgres function, in one transaction; this action only forwards the seat ids
 * the guest picked and translates whatever comes back into a message the form
 * can show. It never computes or trusts a price or a seat's availability itself.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const buyerEmail = normalizeEmail(input.buyerEmail);
  // The form checks the address too; checked again here, where it counts, and by the database.
  if (!isEmail(buyerEmail)) return { ok: false, error: "email" };
  if (input.consent !== true) return { ok: false, error: "consent" };
  if (input.seatIds.length === 0) return { ok: false, error: "no_seats" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_by_email", {
    p_event_id: input.eventId,
    p_buyer_email: buyerEmail,
    p_seat_ids: input.seatIds,
    p_locale: input.locale === "kk" ? "kk" : "ru",
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
    if (error.message?.includes("event_finished")) return { ok: false, error: "unavailable" };
    if (error.message?.includes("invalid_email")) return { ok: false, error: "email" };
    return { ok: false, error: "failed" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.access_token) return { ok: false, error: "failed" };

  // Keep the proof that consent was given. Best effort on purpose: the booking already exists and
  // holds the seats, so a failure here must never turn into a failed booking for the buyer.
  if (row.booking_id) {
    try {
      await createAdminClient()
        ?.from("bookings")
        .update({ consent_given_at: new Date().toISOString() })
        .eq("id", row.booking_id as string);
    } catch {
      // not recorded; the booking stands
    }
  }

  // A free order is confirmed at once: its tickets go out now, after the answer reaches the buyer.
  if (row.booking_id && row.status === "confirmed") {
    const bookingId = row.booking_id as string;
    after(() => sendTicketsEmail(bookingId).then(() => undefined));
  }

  return { ok: true, accessToken: row.access_token as string };
}

/**
 * «Отменить и выбрать другие места»: the seats go back on sale now. Only for an order still waiting
 * for money; the secret order token is the only key. A payment that still arrives afterwards is
 * returned to the buyer automatically.
 */
export async function cancelBooking(token: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_booking_by_token", { p_token: token });
  if (error) return { ok: false };
  return { ok: data === "cancelled" || data === "already_cancelled" };
}
