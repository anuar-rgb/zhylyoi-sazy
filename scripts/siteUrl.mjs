/**
 * The public address printed on banners and encoded in the QR code.
 *
 * Kept here alone because print assets outlive the address: a Railway-generated
 * host is temporary, and when the institution's own domain is registered this
 * one line changes and `create-qrcode.mjs` plus `create-banners.mjs` reproduce
 * every asset consistently. Anything already printed stops working at that
 * moment -- there is no redirect from a released Railway host.
 *
 * One asset stays outside this: `public/banner-a5.html` is a standalone
 * printable page with no build step, so it carries the host as plain text and
 * has to be edited by hand alongside this file.
 *
 * The running site never reads this: it derives absolute URLs from the request
 * headers, so a domain change needs no deploy.
 */
export const PUBLIC_SITE_HOST = "culture-portal-kz-production.up.railway.app";
export const PUBLIC_SITE_URL = `https://${PUBLIC_SITE_HOST}/`;
