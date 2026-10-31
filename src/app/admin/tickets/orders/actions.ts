"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { EVENT_LOCKED_MESSAGE, isBookingEventLocked } from "@/lib/cultureEvents";
import { notifyOrder, type OrderEvent } from "@/lib/telegram";

export type OrderActionResult = { ok: boolean; message: string };

/**
 * The cashier's actions on an order. Each one is a database function (see the migration
 * bookings_manual_payment): it checks the institution, the order's current status and the hold
 * expiry itself, writes the journal (booking_actions) and does nothing on a second press. This
 * file only checks the session and turns the function's answer into words.
 */
const MESSAGES: Record<string, OrderActionResult> = {
  confirmed: { ok: true, message: "Оплата подтверждена, билеты выданы" },
  already_confirmed: { ok: true, message: "Заказ уже был подтверждён — билеты те же" },
  rejected: { ok: true, message: "Заказ отклонён, места освобождены" },
  already_rejected: { ok: true, message: "Заказ уже был отклонён" },
  late: { ok: true, message: "Отмечено как поздняя оплата: выдайте билеты или оформите возврат" },
  already_late: { ok: true, message: "Заказ уже отмечен как поздняя оплата" },
  refunded: { ok: true, message: "Возврат отмечен, билеты больше не действуют" },
  already_refunded: { ok: true, message: "Возврат уже был отмечен" },
  expired: { ok: false, message: "Бронь уже истекла, места могли занять. Если деньги пришли — нажмите «Поздняя оплата»." },
  seats_taken: { ok: false, message: "Часть мест уже продана другим. Выдать билеты нельзя — оформите возврат." },
  event_finished: { ok: false, message: EVENT_LOCKED_MESSAGE },
  pending: { ok: false, message: "Заказ ещё ждёт оплату." },
  payment_reported: { ok: false, message: "Заказ ещё ждёт проверки оплаты." },
  late_payment: { ok: false, message: "Заказ отмечен как поздняя оплата: выдайте билеты или оформите возврат." },
  cancelled: { ok: false, message: "Заказ отменён." },
};

/** Which answers are a real change worth a Telegram message (a repeated press is not). */
const NOTIFY: Record<string, OrderEvent> = {
  confirmed: "confirmed",
  rejected: "rejected",
  late: "late",
  refunded: "refunded",
};
// issue_late_booking answers "confirmed" too; its message says the tickets went out on a late payment.
const NOTIFY_ISSUED_LATE: Record<string, OrderEvent> = { confirmed: "issued" };

async function run(
  bookingId: string,
  fn: string,
  args: Record<string, unknown>
): Promise<OrderActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Не авторизовано." };
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { ok: false, message: "Заказ не найден." };
  if (await isBookingEventLocked(bookingId)) return { ok: false, message: EVENT_LOCKED_MESSAGE };

  const { data, error } = await supabase.rpc(fn, { p_booking_id: bookingId, ...args });
  if (error) {
    return {
      ok: false,
      message: error.message?.includes("booking_not_found") ? "Заказ не найден или недостаточно прав." : "Не удалось выполнить действие.",
    };
  }

  revalidatePath("/admin/tickets/orders");
  // The red count of orders to check sits on the «⋯» menu of the Билеты page.
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/tickets/stats", "layout");
  const event = (fn === "issue_late_booking" ? NOTIFY_ISSUED_LATE : NOTIFY)[String(data)];
  if (event) after(() => notifyOrder(bookingId, event));
  return MESSAGES[String(data)] ?? { ok: false, message: "Действие не выполнено." };
}

const text = (value: string | undefined, max: number) => (value ?? "").trim().slice(0, max) || null;

/** «Подтвердить оплату»: the cashier found the money in Kaspi Pay. Tickets are issued now. */
export async function confirmOrderPayment(bookingId: string, operationId?: string) {
  return run(bookingId, "confirm_booking_manual", { p_operation_id: text(operationId, 100) });
}

/** «Отклонить»: no money found. Seats go back on sale. */
export async function rejectOrder(bookingId: string, note?: string) {
  return run(bookingId, "reject_booking", { p_note: text(note, 500) });
}

/** «Поздняя оплата»: the money came after the hold ran out. No tickets yet. */
export async function markOrderLate(bookingId: string, operationId?: string, note?: string) {
  return run(bookingId, "mark_booking_late", { p_operation_id: text(operationId, 100), p_note: text(note, 500) });
}

/** «Выдать билеты» for a late payment: only when the same seats are still free. */
export async function issueLateOrder(bookingId: string) {
  return run(bookingId, "issue_late_booking", {});
}

/** «Отметить возврат»: the money went back through Kaspi, outside this site. */
export async function markOrderRefunded(bookingId: string, note?: string) {
  return run(bookingId, "mark_booking_refunded", { p_note: text(note, 500) });
}

/** Postgres "undefined_function" / PostgREST "no such function": the event_seat_blocks migration has not been run. */
const NO_BLOCKS = new Set(["42883", "PGRST202"]);
const NO_BLOCKS_MESSAGE = "Закрытие мест ещё не включено в базе: выполните SQL из миграции 20261031150000_event_seat_blocks.sql.";

/**
 * Closes free seats of one event from sale: «Бронь» (kept for a guest) or «Неисправно». Sold and
 * held seats are left alone by the database function itself.
 */
export async function blockSeats(eventId: string, seatIds: string[], kind: "reserved" | "broken", note?: string): Promise<OrderActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || seatIds.length === 0) return { ok: false, message: "Выберите места." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("block_event_seats", {
    p_event_id: eventId,
    p_seat_ids: seatIds,
    p_kind: kind,
    p_note: text(note, 200),
  });
  if (error) {
    if (NO_BLOCKS.has(error.code)) return { ok: false, message: NO_BLOCKS_MESSAGE };
    if (error.message?.includes("event_finished")) return { ok: false, message: EVENT_LOCKED_MESSAGE };
    return { ok: false, message: "Не удалось закрыть места." };
  }
  revalidatePath("/admin/tickets/orders");
  revalidatePath("/admin/tickets/stats", "layout");
  const count = Number(data ?? 0);
  const skipped = seatIds.length - count;
  return {
    ok: count > 0,
    message:
      count === 0
        ? "Эти места уже проданы или ждут оплаты — закрыть их нельзя."
        : `Закрыто мест: ${count}${skipped > 0 ? ` (ещё ${skipped} уже заняты покупателями)` : ""}`,
  };
}

/** Opens closed seats of one event for sale again. */
export async function unblockSeats(eventId: string, seatIds: string[]): Promise<OrderActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || seatIds.length === 0) return { ok: false, message: "Выберите места." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unblock_event_seats", { p_event_id: eventId, p_seat_ids: seatIds });
  if (error) {
    if (NO_BLOCKS.has(error.code)) return { ok: false, message: NO_BLOCKS_MESSAGE };
    if (error.message?.includes("event_finished")) return { ok: false, message: EVENT_LOCKED_MESSAGE };
    return { ok: false, message: "Не удалось открыть места." };
  }
  revalidatePath("/admin/tickets/orders");
  revalidatePath("/admin/tickets/stats", "layout");
  return { ok: true, message: `Открыто для продажи мест: ${Number(data ?? 0)}` };
}
