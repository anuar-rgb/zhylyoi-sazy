import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  answerCallback,
  editButtons,
  notifyOrder,
  orderButtons,
  organizationByCode,
  sendMessage,
  webhookSecret,
  type Buttons,
} from "@/lib/telegram";

/**
 * Telegram calls this for every message to the bot and every press of a button under an order.
 *
 * Only Telegram knows the secret (set with setWebhook, sent back in a header), so a call without it
 * is refused. Who may confirm or reject is decided in the database: the press must come from the
 * chat linked as the cashier of that order's institution (telegram_booking_action).
 *
 * Always answers 200 to Telegram once the secret checks out, even when the action itself failed —
 * otherwise Telegram would retry the same press over and over.
 */

type CallbackQuery = { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
type Update = {
  message?: { text?: string; chat?: { id: number; first_name?: string } };
  callback_query?: CallbackQuery;
};

const UUID = /^[0-9a-f-]{36}$/i;

function secretMatches(given: string | null): boolean {
  const expected = webhookSecret();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("forbidden", { status: 403 });
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return Response.json({ ok: true });
  }

  try {
    if (update.callback_query) await onButton(update.callback_query);
    else if (update.message?.text?.startsWith("/start")) await onStart(update.message.text, update.message.chat?.id);
  } catch {
    // answered below anyway; Telegram must not retry
  }
  return Response.json({ ok: true });
}

/** «/start <code>»: the cashier opened their institution's link — they now receive its orders. */
async function onStart(text: string, chatId: number | undefined) {
  if (!chatId) return;
  const code = text.split(/\s+/)[1];
  if (!code) {
    await sendMessage(String(chatId), "Это бот уведомлений о заказах билетов. Подключиться можно по ссылке из админки сайта: Настройки → «Уведомления в Telegram».");
    return;
  }
  const organizationId = await organizationByCode(code);
  const admin = createAdminClient();
  if (!organizationId || !admin) {
    await sendMessage(String(chatId), "Ссылка не подошла. Откройте ссылку из админки сайта ещё раз.");
    return;
  }
  const { error } = await admin
    .from("org_telegram")
    .upsert({ organization_id: organizationId, chat_id: String(chatId), is_enabled: true, updated_at: new Date().toISOString() });
  if (error) {
    await sendMessage(String(chatId), "Не удалось подключить. Попробуйте ещё раз позже.");
    return;
  }
  revalidatePath("/admin/settings");
  await sendMessage(
    String(chatId),
    "✅ Уведомления о заказах подключены. Сюда будут приходить новые заказы и «Я оплатил» — с кнопками «Подтвердить оплату» и «Отклонить»."
  );
}

const ASK: Record<string, { question: string; buttons: (id: string) => Buttons }> = {
  c: {
    question: "Деньги точно пришли в Kaspi?",
    buttons: (id) => [[["✅ Да, деньги пришли", `cc:${id}`], ["← Назад", `x:${id}`]]],
  },
  r: {
    question: "Отклонить заказ? Места освободятся.",
    buttons: (id) => [[["❌ Да, отклонить", `rr:${id}`], ["← Назад", `x:${id}`]]],
  },
};

/** What each answer of telegram_booking_action means for the cashier; `done` removes the buttons. */
const RESULT: Record<string, { text: string; done: boolean; alert?: boolean }> = {
  confirmed: { text: "Оплата подтверждена, билеты выданы", done: true },
  rejected: { text: "Заказ отклонён, места освобождены", done: true },
  already_confirmed: { text: "Заказ уже подтверждён", done: true },
  already_rejected: { text: "Заказ уже отклонён", done: true },
  expired: { text: "Бронь уже истекла — места могли занять. Если деньги пришли, отметьте «Поздняя оплата» в админке.", done: true, alert: true },
  event_finished: { text: "Мероприятие уже прошло — изменить заказ нельзя.", done: true, alert: true },
  not_allowed: { text: "Этот чат не подключён кассиром этого учреждения.", done: false, alert: true },
  not_found: { text: "Заказ не найден — возможно, мероприятие удалено.", done: true, alert: true },
};

async function onButton(query: CallbackQuery) {
  const [kind, bookingId] = (query.data ?? "").split(":");
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!bookingId || !UUID.test(bookingId) || chatId === undefined || messageId === undefined) {
    await answerCallback(query.id, "Кнопка устарела.");
    return;
  }

  // First press: ask once more, so a stray tap never issues tickets or frees seats.
  if (kind === "c" || kind === "r") {
    await editButtons(chatId, messageId, ASK[kind].buttons(bookingId));
    await answerCallback(query.id, ASK[kind].question);
    return;
  }
  if (kind === "x") {
    await editButtons(chatId, messageId, orderButtons(bookingId));
    await answerCallback(query.id, "Отменено");
    return;
  }
  if (kind !== "cc" && kind !== "rr") {
    await answerCallback(query.id, "Кнопка устарела.");
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    await answerCallback(query.id, "Сайт не настроен (нет служебного ключа).", true);
    return;
  }
  const { data, error } = await admin.rpc("telegram_booking_action", {
    p_booking_id: bookingId,
    p_chat_id: String(chatId),
    p_action: kind === "cc" ? "confirm" : "reject",
  });
  if (error) {
    await answerCallback(query.id, "Не удалось выполнить. Подтвердите заказ в админке сайта.", true);
    return;
  }

  const answer = String(data);
  const result = RESULT[answer] ?? {
    text: answer === "refunded" ? "По заказу уже оформлен возврат." : "Заказ уже не ждёт оплаты — откройте его в админке.",
    done: true,
    alert: true,
  };
  if (result.done) await editButtons(chatId, messageId);
  await answerCallback(query.id, result.text, result.alert ?? false);

  if (answer === "confirmed" || answer === "rejected") {
    revalidatePath("/admin/tickets/orders");
    revalidatePath("/admin/tickets");
    await notifyOrder(bookingId, answer);
  }
}
