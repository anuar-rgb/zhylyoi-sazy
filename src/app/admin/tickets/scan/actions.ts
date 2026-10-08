"use server";

import { createClient } from "@/lib/supabase/server";
import { PARTER, sectionLabel, toSection } from "@/lib/hallSections";

export type CheckInDetails = {
  /** «Балкон», «Левый сектор»…; null for the parter (and for a hall without sections). */
  seatSection: string | null;
  seatRowLabel: string | null;
  seatNumber: number | null;
  eventTitle: string | null;
  orderNumber: string | null;
  eventDate: string | null;
};

export type CheckInFailure =
  | "not_found"
  | "not_confirmed"
  | "wrong_event"
  | "cancelled"
  | "expired"
  | "not_started"
  | "invalid"
  | "failed";

export type CheckInResult =
  | ({ ok: true; status: "ok" | "already_used"; checkedInAt: string | null } & CheckInDetails)
  | ({ ok: false; reason: CheckInFailure } & Partial<CheckInDetails>);

type CheckInRow = {
  result: string;
  seat_row_label: string | null;
  seat_number: number | null;
  event_title_kk: string | null;
  event_title_ru: string | null;
  checked_in_at: string | null;
  public_order_id?: string | null;
  event_date?: string | null;
};

const FAILURES: ReadonlySet<string> = new Set([
  "not_found",
  "not_confirmed",
  "wrong_event",
  "cancelled",
  "expired",
  "not_started",
]);

/**
 * The section of a ticket's seat, named for the door («Балкон»), or null for the parter.
 * check_in_ticket predates sections and returns only row and seat; read after it, and only for a
 * ticket it found, so a guessed code learns nothing more than before. Any failure reads as the
 * parter: it only adds a word to the screen, it never decides who goes in.
 */
async function sectionOfTicket(supabase: Awaited<ReturnType<typeof createClient>>, code: string): Promise<string | null> {
  const { data, error } = await supabase.from("booking_items").select("hall_seats(section)").eq("ticket_code", code).maybeSingle();
  if (error || !data) return null;
  const seat = (Array.isArray(data.hall_seats) ? data.hall_seats[0] : data.hall_seats) as { section?: string } | null;
  const section = toSection(seat?.section);
  return section === PARTER ? null : sectionLabel(section);
}

/**
 * The one entry point for marking a ticket checked in: a single .rpc() call.
 * check_in_ticket decides everything (same institution, right event, paid, not cancelled, not used,
 * inside the entry window) and writes the journal; this action only translates the answer.
 *
 * An answer it does not recognise is a failure, never a success: a door must not let someone in
 * because the database said something this code has not learned yet.
 */
export async function checkInTicket(code: string, eventId?: string | null): Promise<CheckInResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_ticket_code: trimmed,
    p_event_id: eventId ?? null,
  });

  if (error) {
    // A code that is not even a valid uuid never reaches the function: Postgres rejects the cast.
    return { ok: false, reason: error.code === "22P02" ? "invalid" : "failed" };
  }

  const row = (data as CheckInRow[] | null)?.[0];
  if (!row) return { ok: false, reason: "failed" };

  const details: CheckInDetails = {
    seatSection: row.seat_row_label ? await sectionOfTicket(supabase, trimmed) : null,
    seatRowLabel: row.seat_row_label,
    seatNumber: row.seat_number,
    eventTitle: row.event_title_ru ?? row.event_title_kk,
    orderNumber: row.public_order_id ?? null,
    eventDate: row.event_date ?? null,
  };

  if (row.result === "ok" || row.result === "already_used") {
    return { ok: true, status: row.result, checkedInAt: row.checked_in_at, ...details };
  }
  if (FAILURES.has(row.result)) {
    return { ok: false, reason: row.result as CheckInFailure, ...details };
  }
  return { ok: false, reason: "failed" };
}
