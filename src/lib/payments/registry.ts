import { isMockEnabled } from "./dev";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

/**
 * Bank integrations that exist. Empty on purpose: each one is written against that bank's own
 * documentation and contract, which the institution has to obtain first. Nothing is guessed.
 *
 * To add one: write src/lib/payments/<bank>.ts implementing PaymentProvider, import it here and
 * list it under its payment_providers.code. Nothing else changes.
 */
const realProviders: Record<string, PaymentProvider> = {};

/** The provider for a code, or null when there is none (or it is the mock outside development). */
export function getProvider(code: string): PaymentProvider | null {
  if (code === mockProvider.code) return isMockEnabled() ? mockProvider : null;
  return realProviders[code] ?? null;
}

export function hasProvider(code: string): boolean {
  return getProvider(code) !== null;
}
