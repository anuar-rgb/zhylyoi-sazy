/**
 * Turns a phone as typed into a dialable link.
 *
 * The number is entered by hand in the admin panel, so it may carry spaces,
 * brackets or dashes. A tel: link has to be digits and an optional leading plus,
 * while the page keeps showing the readable form.
 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
