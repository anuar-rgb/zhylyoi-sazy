"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EVENT_LOCKED_MESSAGE, isBookingEventLocked } from "@/lib/cultureEvents";

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
