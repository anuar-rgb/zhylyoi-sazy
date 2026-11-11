/**
 * Email addresses as the booking form takes them. Safe to import from client components.
 * Deliberately loose: anything shaped like name@host.domain, the same rule the database checks
 * (bookings_buyer_email_check). Whether the box exists only the mail server can tell.
 */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= 254 && EMAIL.test(email);
}
