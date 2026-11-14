/**
 * «Поддержка» rules both the browser form and the server check: limits, statuses, and which files
 * a message may point at. No server imports here.
 */

export const SUPPORT_SUBJECT_MAX = 200;
export const SUPPORT_BODY_MAX = 5000;
export const SUPPORT_MAX_IMAGES = 3;
/** The bucket's own limit (migration 20261114230000); the form shrinks pictures well below it. */
export const SUPPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const SUPPORT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type SupportStatus = "open" | "answered" | "closed";

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Ждёт ответа",
  answered: "Есть ответ",
  closed: "Закрыто",
};

export const SUPPORT_STATUS_STYLES: Record<SupportStatus, string> = {
  open: "bg-gold/20 text-ocean-dark",
  answered: "bg-emerald-50 text-emerald-700",
  closed: "bg-ocean/10 text-ocean/60",
};

export function supportStatus(value: unknown): SupportStatus {
  return value === "answered" || value === "closed" ? value : "open";
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function supportImageExt(type: string): string | null {
  return EXT[type] ?? null;
}

/** A file path a message may carry: inside its own institution's folder, named by the server. */
export function isOwnSupportImage(path: unknown, organizationId: string): path is string {
  if (typeof path !== "string") return false;
  const re = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;
  const m = re.exec(path);
  return Boolean(m && m[1].toLowerCase() === organizationId.toLowerCase());
}

/** Trimmed text within a limit, or null when empty or too long. */
export function supportText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  return text && text.length <= max ? text : null;
}
