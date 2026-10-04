/**
 * The bookings this browser has made or opened, remembered on the device.
 *
 * Buyers have no account. What lets someone back into a booking is its secret token, so the token
 * is kept in this browser's local storage and the "Билеты" page lists them. Nothing is stored on
 * the server for this: another device, another browser or cleared site data starts empty, and
 * the link to the booking page still works from anywhere.
 *
 * The tokens are secrets, so only tokens go in; everything shown about them is fetched fresh from
 * the server (POST /api/my-tickets), which also tells us when a booking no longer exists, for
 * example because the event was deleted in the admin. Those are then forgotten here too.
 */
export const STORAGE_KEY = "myTickets:v1";
export const MAX_TOKENS = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TokenStorage = Pick<Storage, "getItem" | "setItem">;

function clean(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && UUID.test(item)) seen.add(item.toLowerCase());
  }
  return [...seen].slice(0, MAX_TOKENS);
}

export function readTokens(storage: TokenStorage): string[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? clean(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function write(storage: TokenStorage, tokens: string[]): string[] {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Private mode or a full disk: the page still works, it just will not remember.
  }
  return tokens;
}

/** Newest first. Adding one that is already there moves it to the front. */
export function addToken(storage: TokenStorage, token: string): string[] {
  if (!UUID.test(token)) return readTokens(storage);
  const rest = readTokens(storage).filter((t) => t !== token.toLowerCase());
  return write(storage, [token.toLowerCase(), ...rest].slice(0, MAX_TOKENS));
}

export function removeTokens(storage: TokenStorage, remove: string[]): string[] {
  const gone = new Set(remove.map((t) => t.toLowerCase()));
  return write(
    storage,
    readTokens(storage).filter((t) => !gone.has(t))
  );
}

/** The browser's own storage, or null where it is unavailable or blocked. */
export function deviceStorage(): TokenStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Called when a booking is made or its page is opened. */
export function rememberTicket(token: string): void {
  const storage = deviceStorage();
  if (storage) addToken(storage, token);
}
