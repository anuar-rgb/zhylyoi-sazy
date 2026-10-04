/**
 * The address the visitor used to reach the site, e.g. https://culture-portal-kz-production.up.railway.app.
 *
 * Behind Railway's proxy the request URL names an internal host, so the forwarded headers come
 * first. Used to build the addresses a payment provider calls back and sends the buyer to; not for
 * anything security-relevant, since those headers can be set by the caller.
 */
export function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
