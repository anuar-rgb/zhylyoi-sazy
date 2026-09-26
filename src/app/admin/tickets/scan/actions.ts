"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckInResult =
  | {
      ok: true;
      status: "ok" | "already_used";
      seatRowLabel: string | null;
      seatNumber: number | null;
      eventTitle: string | null;
      checkedInAt: string | null;
    }
  | { ok: false; reason: "not_found" | "not_confirmed" | "invalid" | "failed" };

type CheckInRow = {
  result: string;
  seat_row_label: string | null;
  seat_number: number | null;
  event_title_kk: string | null;
  event_title_ru: string | null;
  checked_in_at: string | null;
};

/**
 * The one entry point for marking a ticket checked in — a single .rpc() call,
 * same shape as create_booking's role in Phase 3. check_in_ticket itself
 * decides same-organization access; this action never queries booking_items
 * or bookings directly.
 */
export async function checkInTicket(code: string): Promise<CheckInResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", { p_ticket_code: trimmed });

  if (error) {
    // A code that isn't even a valid uuid never reaches the function at all —
    // Postgres rejects the cast before check_in_ticket runs.
    return { ok: false, reason: error.code === "22P02" ? "invalid" : "failed" };
  }

  const row = (data as CheckInRow[] | null)?.[0];
  if (!row) return { ok: false, reason: "failed" };

  if (row.result === "not_found") return { ok: false, reason: "not_found" };
  if (row.result === "not_confirmed") return { ok: false, reason: "not_confirmed" };

  return {
    ok: true,
    status: row.result === "already_used" ? "already_used" : "ok",
    seatRowLabel: row.seat_row_label,
    seatNumber: row.seat_number,
    eventTitle: row.event_title_ru ?? row.event_title_kk,
    checkedInAt: row.checked_in_at,
  };
}
