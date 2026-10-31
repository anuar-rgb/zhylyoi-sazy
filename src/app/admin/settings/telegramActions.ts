"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { findStart, linkCode, sendMessage, telegramConfigured } from "@/lib/telegram";

export type TelegramResult = { ok: boolean; message: string };

async function organizationId(): Promise<string | null> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return null;
  return identity.organizationId ?? (await getSiteOrganizationId());
}

/**
 * «Проверить»: finds the Start the cashier pressed with this institution's link and keeps their
 * chat as the place order notifications go. Linking another person replaces the previous one.
 */
export async function checkTelegramLink(): Promise<TelegramResult> {
  if (!telegramConfigured()) return { ok: false, message: "На сервере не задан токен бота (TELEGRAM_BOT_TOKEN)." };
  const orgId = await organizationId();
  if (!orgId) return { ok: false, message: "Профиль сотрудника не настроен." };
  const code = linkCode(orgId);
  if (!code) return { ok: false, message: "На сервере не задан токен бота." };

  const found = await findStart(code);
  if (!found) {
    return { ok: false, message: "Бот ещё не получил «Start» по этой ссылке. Откройте ссылку, нажмите Start в боте и проверьте снова." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_telegram")
    .upsert({ organization_id: orgId, chat_id: found.chatId, is_enabled: true, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: "Не удалось сохранить: подключать уведомления может только администратор учреждения." };

  await sendMessage(found.chatId, "✅ Уведомления о заказах подключены. Сюда будут приходить новые заказы, «Я оплатил» и всё, что дальше происходит с заказом.");
  revalidatePath("/admin/settings");
  return { ok: true, message: `Подключено${found.name ? `: ${found.name}` : ""}` };
}

/** Sends a test message to the linked cashier. */
export async function sendTelegramTest(): Promise<TelegramResult> {
  const orgId = await organizationId();
  if (!orgId) return { ok: false, message: "Профиль сотрудника не настроен." };
  const supabase = await createClient();
  const { data } = await supabase.from("org_telegram").select("chat_id").eq("organization_id", orgId).maybeSingle();
  if (!data?.chat_id) return { ok: false, message: "Кассир ещё не подключён." };
  const sent = await sendMessage(String(data.chat_id), "🔔 Проверка: уведомления о заказах работают.");
  return sent ? { ok: true, message: "Тестовое сообщение отправлено" } : { ok: false, message: "Telegram не принял сообщение. Возможно, кассир остановил бота — подключите заново." };
}

/** Stops the notifications; the cashier can be linked again at any time. */
export async function disconnectTelegram(): Promise<TelegramResult> {
  const orgId = await organizationId();
  if (!orgId) return { ok: false, message: "Профиль сотрудника не настроен." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("org_telegram")
    .update({ chat_id: null, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("organization_id", orgId);
  if (error || count === 0) return { ok: false, message: "Не удалось отключить." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Уведомления отключены" };
}
