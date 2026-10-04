"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckInDetails = {
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
