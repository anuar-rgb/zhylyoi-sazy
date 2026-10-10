/**
 * Kazakhstan phone numbers, +7 and ten digits: «+7 (777) 000-00-00». Safe to import from client
 * components.
 */

/** The ten digits after +7, from whatever was typed or pasted (at most ten). */
export function phoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // «+7 …» as the field shows it, or a pasted «+7 701…», «8 701…», «7 701…» with all eleven digits:
  // the first digit is the country code (8 is the old trunk prefix for it), not part of the number.
  if (raw.trimStart().startsWith("+7") || (digits.length === 11 && /^[78]/.test(digits))) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** «+7 (777) 000-00-00» for ten digits, and the same as far as it goes for fewer; "" for none. */
export function formatPhone(digits: string): string {
  if (digits.length === 0) return "";
  let text = `+7 (${digits.slice(0, 3)}`;
  if (digits.length > 3) text += `) ${digits.slice(3, 6)}`;
  if (digits.length > 6) text += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) text += `-${digits.slice(8, 10)}`;
  return text;
}

/** The field's next value after an edit. Erasing only a bracket, space or dash erases the digit before it. */
export function nextPhoneValue(previous: string, typed: string): string {
  let digits = phoneDigits(typed);
  if (typed.length < previous.length && digits === phoneDigits(previous)) digits = digits.slice(0, -1);
  return formatPhone(digits);
}

export function isCompletePhone(value: string): boolean {
  return phoneDigits(value).length === 10;
}
