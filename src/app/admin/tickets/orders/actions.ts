"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EVENT_LOCKED_MESSAGE, isBookingEventLocked } from "@/lib/cultureEvents";
import { getStaffIdentity } from "@/lib/profile";
import { livePipeline } from "@/lib/payments/deps";
import { MIN_REFUND_AMOUNT, refundItems, refundPayment } from "@/lib/payments/pipeline";

export type OrderActionResult = { ok: boolean; message: string };

/**
 * The cashier's actions on an order. Money is taken and returned only by the bank; the cashier
 * starts a refund here, and the order changes once the bank agreed. Cancelling a free order is a
 * database function (mark_booking_refunded) that checks the institution and the order's status
 * itself; this file only checks the session and turns its answer into words.
 */
const MESSAGES: Record<string, OrderActionResult> = {
  refunded: { ok: true, message: "Билеты аннулированы, места снова в продаже" },
  already_refunded: { ok: true, message: "Билеты уже были аннулированы" },
  event_finished: { ok: false, message: EVENT_LOCKED_MESSAGE },
  pending: { ok: false, message: "Заказ ещё ждёт оплату." },
  cancelled: { ok: false, message: "Заказ отменён." },
};

const REFUND_REFUSED: Record<string, string> = {
  nothing_to_refund: "Выберите места для возврата.",
  items_not_refundable: "Часть выбранных мест уже возвращена или не относится к заказу. Обновите страницу.",
  amount_too_small: `Банк не возвращает меньше ${MIN_REFUND_AMOUNT} ₸ за один раз.`,
  amount_exceeds_payment: "Сумма возврата больше оплаченной. Обновите страницу.",
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

/** «Аннулировать билеты» of a free order: no money moved, so nothing goes back. */
export async function markOrderRefunded(bookingId: string, note?: string) {
  return run(bookingId, "mark_booking_refunded", { p_note: text(note, 500) });
}

function revalidateOrders() {
  revalidatePath("/admin/tickets/orders");
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/tickets/stats", "layout");
}

/**
 * The order's bank payment, for a refund by the server's key. The checks are explicit: the order
 * must be visible to this staff member, belong to their own institution and its event be current.
 */
async function refundablePayment(bookingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { error: "Заказ не найден." } as const;
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Не авторизовано." } as const;
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("organization_id").eq("id", bookingId).maybeSingle();
  if (!booking || (identity.organizationId && identity.organizationId !== booking.organization_id)) {
    return { error: "Заказ не найден или недостаточно прав." } as const;
  }
  if (await isBookingEventLocked(bookingId)) return { error: EVENT_LOCKED_MESSAGE } as const;

  let deps;
  try {
    deps = livePipeline();
  } catch {
    return { error: "На сервере не задан служебный ключ." } as const;
  }
  const [payment] = await deps.store.listRefundablePayments(bookingId);
  if (!payment) return { error: "По этому заказу нет оплаты картой." } as const;
  return { deps, payment, actorId: identity.userId } as const;
}

/** «Вернуть весь заказ»: what is left of the payment goes back through the bank. */
export async function refundOrderOnline(bookingId: string): Promise<OrderActionResult> {
  const found = await refundablePayment(bookingId);
  if ("error" in found) return { ok: false, message: found.error ?? "Не удалось выполнить действие." };

  const result = await refundPayment(found.deps, found.payment);
  if (!result.ok) return { ok: false, message: "Банк не выполнил возврат. Заказ не изменён, деньги у покупателя не возвращены." };

  revalidateOrders();
  return { ok: true, message: "Деньги возвращены через банк, билеты больше не действуют" };
}

/** «Вернуть выбранные»: the price of the chosen seats goes back; the rest of the order stands. */
export async function refundOrderItemsOnline(bookingId: string, itemIds: string[]): Promise<OrderActionResult> {
  const ids = [...new Set(itemIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return { ok: false, message: REFUND_REFUSED.nothing_to_refund };
  const found = await refundablePayment(bookingId);
  if ("error" in found) return { ok: false, message: found.error ?? "Не удалось выполнить действие." };

  const result = await refundItems(found.deps, found.payment, ids, found.actorId);
  if (!result.ok) {
    if (result.reason.startsWith("recorded_failed")) {
      revalidateOrders();
      return { ok: false, message: "Банк вернул деньги, но сайт не смог отметить возврат. Сообщите администратору платформы." };
    }
    return { ok: false, message: REFUND_REFUSED[result.reason] ?? "Банк не выполнил возврат. Заказ не изменён, деньги у покупателя не возвращены." };
  }

  revalidateOrders();
  return {
    ok: true,
    message: result.all
      ? "Деньги возвращены через банк, билеты больше не действуют"
      : `Возвращено ${result.amount.toLocaleString("ru-RU")} ₸ за ${ids.length} ${ids.length === 1 ? "место" : "места"}, остальные билеты действуют`,
  };
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
