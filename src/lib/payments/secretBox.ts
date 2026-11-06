import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Bank secrets at rest. A secret in the database is useless without PAYMENT_SECRETS_KEY, which
 * lives only in the server's environment: a leaked copy of the table cannot move anyone's money.
 */
const PREFIX = "v1:";

function key(): Buffer | null {
  const raw = process.env.PAYMENT_SECRETS_KEY?.trim();
  return raw ? createHash("sha256").update(raw).digest() : null;
}

export function secretsKeyConfigured(): boolean {
  return key() !== null;
}

/** Null when the server has no key: a secret is never stored in the clear. */
export function encryptSecret(plain: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(":");
}

/**
 * Null when the key is missing or wrong. A value without the prefix is returned as is: the mock
 * provider's development keys were stored before encryption existed.
 */
export function decryptSecret(stored: string): string | null {
  if (!stored.startsWith(PREFIX)) return stored;
  const k = key();
  if (!k) return null;
  try {
    const [iv, tag, data] = stored.slice(PREFIX.length).split(":").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
