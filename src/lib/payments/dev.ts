/**
 * The mock provider and everything under /dev exist for developers only.
 *
 * Tied to NODE_ENV, which Next sets to "production" for a built and started site (as on Railway)
 * and to "development" under `next dev`. There is no variable that turns it on in production.
 */
export function isMockEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
