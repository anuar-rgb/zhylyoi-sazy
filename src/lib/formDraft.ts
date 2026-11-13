/**
 * Drafts of what a visitor is typing or choosing, kept in the tab's sessionStorage so an accidental
 * reload does not lose them: the seats and email on the ticket page, the club application, the
 * contact form. Each draft carries the time it was saved and is ignored after DRAFT_TTL_MS.
 *
 * sessionStorage belongs to the one tab and is gone when it closes; nothing here leaves the device.
 * Consent checkboxes are never stored: agreeing to data processing is asked for again each time.
 *
 * Plain functions over an injected storage, so tests can pass a fake one.
 */

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** How long a draft is offered back: long enough for a reload, short enough that held-up seats are rechecked. */
export const DRAFT_TTL_MS = 15 * 60 * 1000;

const PREFIX = "draft:";

type Stored<T> = { savedAt: number; value: T };

/** The tab's sessionStorage, or null where it is unavailable or blocked (private mode, previews). */
export function sessionDraftStorage(): DraftStorage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** The saved value, or null when there is none, it is older than the TTL, or it cannot be read. */
export function readDraft<T>(storage: DraftStorage | null, key: string, now = Date.now(), ttlMs = DRAFT_TTL_MS): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFIX + key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<T>;
    if (typeof stored?.savedAt !== "number" || now - stored.savedAt > ttlMs || now < stored.savedAt) {
      storage.removeItem(PREFIX + key);
      return null;
    }
    return stored.value ?? null;
  } catch {
    return null;
  }
}

export function writeDraft<T>(storage: DraftStorage | null, key: string, value: T, now = Date.now()): void {
  if (!storage) return;
  try {
    storage.setItem(PREFIX + key, JSON.stringify({ savedAt: now, value } satisfies Stored<T>));
  } catch {
    // Full or blocked storage: the draft is a convenience, the form works without it.
  }
}

export function clearDraft(storage: DraftStorage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(PREFIX + key);
  } catch {
    // as above
  }
}

/** True when every field of a text draft is empty, so an untouched form does not leave a draft behind. */
export function isBlankDraft(value: Record<string, unknown>): boolean {
  return Object.values(value).every((v) => (Array.isArray(v) ? v.length === 0 : typeof v === "string" ? v.trim() === "" : v == null));
}
