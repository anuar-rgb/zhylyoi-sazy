/**
 * A small sliding-window limiter, kept in this process's memory.
 *
 * Enough to blunt a flood against one instance (a script hammering a webhook or the payment-start
 * endpoint). It is not shared between instances and is lost on restart: if the site is ever run
 * as several instances, move this to a shared store before relying on it as a hard limit.
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  // Forget keys that have been quiet, so the map cannot grow without bound.
  if (now - lastSweep > windowMs * 5) {
    lastSweep = now;
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
