import "server-only";

export type TranslateLang = "kk" | "ru";

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

/**
 * The earlier approach called the public endpoint translate.google.com itself
 * uses in the browser — no key, no billing account. It came back blocked with a
 * 429 "automated queries" page from every network tested, including a fetch
 * routed through separate infrastructure: a server on a data-center IP gets
 * flagged far more readily than a person's browser. Google Cloud's own
 * Translation API replaces it — same engine, but meant to be called this way.
 *
 * Requires GOOGLE_TRANSLATE_API_KEY: a Cloud Translation API key from a Google
 * Cloud project with billing attached (Google requires a billing account even
 * for the free tier). The institution's volume sits far under the 500,000
 * characters/month free allowance, so nothing here should ever be charged for —
 * but the account and key are set up once, outside this codebase, and are not
 * something this code can create for itself.
 */
function apiKey(): string {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("Переводчик не настроен: нет ключа GOOGLE_TRANSLATE_API_KEY.");
  return key;
}

/**
 * Translates several independent texts in one request. Blank entries are passed
 * through as "" without spending any quota on them.
 */
export async function translateBatch(texts: string[], from: TranslateLang, to: TranslateLang): Promise<string[]> {
  const trimmed = texts.map((t) => t.trim());
  const toSend = trimmed.filter((t) => t.length > 0);
  if (toSend.length === 0) return texts.map(() => "");

  const response = await fetch(`${ENDPOINT}?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: toSend, source: from, target: to, format: "text" }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Переводчик ответил ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { data?: { translations?: { translatedText: string }[] } };
  const translations = data.data?.translations;
  if (!translations || translations.length !== toSend.length) {
    throw new Error("Не удалось разобрать ответ переводчика.");
  }

  // Re-thread the translated results back into the original positions, since
  // blank entries were stripped out before the request and never sent.
  let cursor = 0;
  return trimmed.map((t) => (t.length > 0 ? translations[cursor++].translatedText : ""));
}

/** Translates one piece of text. Returns "" for blank input without a network call. */
export async function translateText(text: string, from: TranslateLang, to: TranslateLang): Promise<string> {
  const [result] = await translateBatch([text], from, to);
  return result;
}
