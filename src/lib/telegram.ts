import type { NewApplication } from "@/lib/applications";

/** Sends a best-effort Telegram notification; the application is saved regardless of the outcome. */
export async function notifyTelegram(record: NewApplication): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    "🆕 Жаңа өтінім / Новая заявка",
    `Баланың аты-жөні / ФИО ребёнка: ${record.childName}`,
    `Жасы / Возраст: ${record.age}`,
    `Ата-ана телефоны / Телефон родителя: ${record.parentPhone}`,
    `Үйірме / Кружок: ${record.clubTitle}`,
  ];
  if (record.comment.trim()) {
    lines.push(`Пікір / Комментарий: ${record.comment.trim()}`);
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
    });
  } catch {
    // Network/Telegram outage: swallow — the submission itself already succeeded.
  }
}
