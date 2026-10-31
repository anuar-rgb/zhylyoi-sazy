import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTime } from "@/lib/timeZone";

/**
 * Order notifications in Telegram: one bot for the whole platform (its token lives only in the
 * server's environment, TELEGRAM_BOT_TOKEN), one cashier per institution who receives them in a
 * private chat with the bot. The cashier's chat id is kept in org_telegram.chat_id.
 *
 * Telegram lets a bot write to a person only after that person has pressed Start in it, so the
 * cashier links themselves: a t.me link carries a code tied to the institution, and «Проверить»
 * finds that Start among the bot's recent messages (getUpdates — no webhook to run).
 *
 * Messages carry the order number, event, count and sum, never the buyer's name or phone: the
 * chat lives on Telegram's servers abroad, and the cashier opens the order in the admin for the rest.
 *
 * Nothing here ever throws into its caller: a notification that cannot be sent must not fail
 * a booking or a cashier's action.
 */

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function telegramConfigured(): boolean {
  return token() !== null;
}

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

async function call<T>(method: string, body: Record<string, unknown>): Promise<TelegramResponse<T> | null> {
  const t = token();
  if (!t) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    return (await res.json()) as TelegramResponse<T>;
  } catch {
    return null;
  }
}

/** The code in the cashier's link: tied to the institution, unguessable without the bot's token. */
export function linkCode(organizationId: string): string | null {
  const t = token();
  if (!t) return null;
  return createHmac("sha256", t).update(`link:${organizationId}`).digest("base64url").slice(0, 24);
}

/** The bot's @username, for the t.me link. */
export async function botUsername(): Promise<string | null> {
  const me = await call<{ username?: string }>("getMe", {});
  return me?.ok ? (me.result?.username ?? null) : null;
}

export async function sendMessage(chatId: string, html: string): Promise<boolean> {
  const res = await call("sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true });
  return res?.ok === true;
}

type Update = { update_id: number; message?: { text?: string; chat?: { id: number; first_name?: string; username?: string } } };

/**
 * Looks for «/start <code>» among the bot's recent messages. Returns the chat it came from, or
 * null when nobody has pressed Start with this code yet (or the bot cannot be reached).
 */
export async function findStart(code: string): Promise<{ chatId: string; name: string } | null> {
  const res = await call<Update[]>("getUpdates", { limit: 100, allowed_updates: ["message"] });
  if (!res?.ok || !res.result) return null;
  const hit = [...res.result].reverse().find((u) => u.message?.text?.trim() === `/start ${code}` && u.message.chat);
  if (!hit?.message?.chat) return null;
  const chat = hit.message.chat;
  // Mark everything up to here as read, so the list does not grow until old Starts drop out.
  const last = res.result[res.result.length - 1]?.update_id;
  if (last !== undefined) await call("getUpdates", { offset: last + 1, limit: 1 });
  return { chatId: String(chat.id), name: chat.first_name ?? (chat.username ? `@${chat.username}` : "") };
}

/** The address of this site, for links in the messages. */
async function siteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // outside a request
  }
  return "https://culture-portal-kz-production.up.railway.app";
}

export type OrderEvent =
  | "created"
  | "payment_reported"
  | "reported_after_expiry"
  | "confirmed"
  | "rejected"
  | "late"
  | "issued"
  | "refunded";

const HEAD: Record<OrderEvent, (order: string) => string> = {
  created: (o) => `🎫 <b>Новый заказ ${o}</b>`,
  payment_reported: (o) => `💰 <b>${o}: покупатель сообщил об оплате</b>`,
  reported_after_expiry: (o) => `⏰ <b>${o}: сообщил об оплате, но бронь уже истекла</b>`,
  confirmed: (o) => `✅ <b>${o}: оплата подтверждена</b>, билеты выданы`,
  rejected: (o) => `❌ <b>${o}: заказ отклонён</b>, места освобождены`,
  late: (o) => `🕓 <b>${o}: отмечен как поздняя оплата</b>`,
  issued: (o) => `✅ <b>${o}: билеты выданы</b> по поздней оплате`,
  refunded: (o) => `↩️ <b>${o}: возврат отмечен</b>, билеты больше не действуют`,
};

const TAIL: Partial<Record<OrderEvent, string>> = {
  payment_reported: "Проверьте поступление в Kaspi и подтвердите заказ.",
  reported_after_expiry: "Если деньги пришли — нажмите «Поздняя оплата».",
};

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tickets(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} билет`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} билета`;
  return `${n} билетов`;
}

/** The same, for an order known only by the buyer's secret token (the order page). */
export async function notifyOrderByToken(token: string, event: OrderEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin || !telegramConfigured()) return;
    const { data } = await admin.from("bookings").select("id").eq("access_token", token).maybeSingle();
    if (data?.id) await notifyOrder(String(data.id), event);
  } catch {
    // best effort
  }
}

/**
 * Tells the institution's cashier what just happened to an order. Reads with the server's own key,
 * since the buyer who triggers most of these cannot read the order, the event or the chat id.
 * Best effort: returns quietly when Telegram is not set up, not linked, or unreachable.
 */
export async function notifyOrder(bookingId: string, event: OrderEvent): Promise<void> {
  try {
    if (!telegramConfigured()) return;
    const admin = createAdminClient();
    if (!admin) return;

    const { data: booking } = await admin
      .from("bookings")
      .select("organization_id, public_order_id, total_amount, expires_at, event_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const [{ data: link }, { data: ev }, { count }] = await Promise.all([
      admin.from("org_telegram").select("chat_id, is_enabled").eq("organization_id", booking.organization_id).maybeSingle(),
      admin.from("culture_events").select("title_ru, title_kk").eq("id", booking.event_id).maybeSingle(),
      admin.from("booking_items").select("id", { count: "exact", head: true }).eq("booking_id", bookingId),
    ]);
    if (!link?.chat_id || link.is_enabled === false) return;

    const order = escape(String(booking.public_order_id ?? "Заказ"));
    const title = escape(String(ev?.title_ru ?? ev?.title_kk ?? "мероприятие"));
    const sum = `${Number(booking.total_amount ?? 0).toLocaleString("ru-RU")} ₸`;
    const lines = [HEAD[event](order), `${title} · ${tickets(count ?? 0)} · ${sum}`];
    if (event === "created" && booking.expires_at) lines.push(`Места держатся до ${formatTime(booking.expires_at)}.`);
    if (TAIL[event]) lines.push(TAIL[event]!);
    const filter = event === "created" || event === "payment_reported" ? "?status=pending" : "";
    lines.push(`<a href="${await siteOrigin()}/admin/tickets/orders${filter}">Открыть заказы</a>`);

    await sendMessage(String(link.chat_id), lines.join("\n"));
  } catch {
    // a notification is never worth failing the action that triggered it
  }
}
