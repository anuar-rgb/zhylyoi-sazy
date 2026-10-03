import type { PaymentAdapter } from "./types";

/**
 * Bank integrations that exist. Empty on purpose: each one is written against that bank's own
 * documentation and contract, which the institution has to obtain first.
 *
 * To add one: write src/lib/payments/<bank>.ts implementing PaymentAdapter, import it here and
 * list it under its payment_providers.code. Nothing else changes.
 */
export const adapters: Record<string, PaymentAdapter> = {};
