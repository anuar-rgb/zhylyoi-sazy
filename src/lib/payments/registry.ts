import { isMockEnabled } from "./dev";
import { mockProvider } from "./mock";
import { halykEpayProvider } from "./halykEpay";
import type { PaymentProvider } from "./types";

/**
 * Bank integrations that exist. Each one is written against that bank's own documentation and
 * contract, which the institution has to obtain first. Nothing is guessed.
 *
 * To add one: write src/lib/payments/<bank>.ts implementing PaymentProvider, import it here and
 * list it under its payment_providers.code. Nothing else changes.
 */
const realProviders: Record<string, PaymentProvider> = { [halykEpayProvider.code]: halykEpayProvider };

/**
 * Halyk stays off on the live site until HALYK_EPAY_LIVE=1: on its test server a token handed to
 * the buyer's form can read and refund other payments, and Halyk has yet to answer about the live
 * one (docs/payments.md). Under `next dev` it runs against their test server.
 */
function isAllowed(code: string): boolean {
  return code !== halykEpayProvider.code || isMockEnabled() || process.env.HALYK_EPAY_LIVE === "1";
}

/** The provider for a code, or null when there is none (or it is the mock outside development). */
export function getProvider(code: string): PaymentProvider | null {
  if (code === mockProvider.code) return isMockEnabled() ? mockProvider : null;
  return isAllowed(code) ? (realProviders[code] ?? null) : null;
}

export function hasProvider(code: string): boolean {
  return getProvider(code) !== null;
}

/** The site has an integration for this bank, switched on or not (see isAllowed). */
export function hasIntegration(code: string): boolean {
  return code in realProviders;
}
