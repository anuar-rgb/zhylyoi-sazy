/**
 * Which institution's site a request is for, read from the address the visitor used.
 *
 * The platform serves every institution from one app; each has its own domain
 * (organizations.domain), and the host header names it. Pure functions: no server imports.
 */

/**
 * The domain as stored in organizations.domain: lowercase, without the port, a trailing dot or a
 * leading "www." (www.dk-zhylyoi.kz and dk-zhylyoi.kz are one site). Null for an empty host.
 */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  let h = host.trim().toLowerCase();
  // [::1]:3000 → [::1]; example.kz:443 → example.kz
  if (h.startsWith("[")) h = h.slice(0, h.indexOf("]") + 1);
  else h = h.replace(/:\d+$/, "");
  h = h.replace(/\.$/, "").replace(/^www\./, "");
  return h || null;
}

/**
 * The server itself and a developer's machine: localhost, 127.0.0.1, ::1. The site's port is bound
 * to the loopback only, so a request with such a host comes from the server (health checks, a test
 * copy through a tunnel) or from development, never from a visitor.
 */
export function isLocalHost(host: string | null): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

/**
 * The domain to look the institution up by. A local request stands in for the fallback domain
 * (SITE_FALLBACK_DOMAIN, by default the first institution's), so checks on the server and
 * development keep working; any other host is taken as it is.
 */
export function siteDomainFor(host: string | null | undefined, fallback: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized || isLocalHost(normalized)) return normalizeHost(fallback);
  return normalized;
}

/**
 * A domain as typed by a person (with https://, a path, capitals, www.) as it is stored in
 * organizations.domain, or null when it is not a domain name.
 */
export function cleanDomain(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const domain = normalizeHost(raw);
  if (!domain) return null;
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain) ? domain : null;
}
