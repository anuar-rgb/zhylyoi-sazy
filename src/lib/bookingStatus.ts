/**
 * Order (bookings.status) states of the manual payment flow, in one place. Safe to import from
 * client components. The database enforces the same list (bookings_status_check).
 *
 * Paying is manual: the buyer pays by the institution's own link or QR, a cashier finds the
 * money in Kaspi Pay and confirms the order. «Я оплатил» (payment_reported) is a note to the
 * cashier, never proof of payment.
 */
export type BookingStatus =
  | "pending"
  | "payment_reported"
  | "confirmed"
  | "expired"
  | "rejected"
  | "late_payment"
  | "refunded"
  | "cancelled";

const ALL: BookingStatus[] = ["pending", "payment_reported", "confirmed", "expired", "rejected", "late_payment", "refunded", "cancelled"];

export function toBookingStatus(value: unknown): BookingStatus {
  return ALL.includes(value as BookingStatus) ? (value as BookingStatus) : "cancelled";
}

/** Seats held for 15 minutes while the money is checked. */
export const HOLD_STATUSES: BookingStatus[] = ["pending", "payment_reported"];
/** Seats taken: held or sold. */
export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "payment_reported", "confirmed"];
/** Orders the cashier has to look at. */
export const CASHIER_QUEUE_STATUSES: BookingStatus[] = ["payment_reported", "pending", "late_payment"];

export function isHold(status: string): boolean {
  return HOLD_STATUSES.includes(status as BookingStatus);
}

/** Staff wording. */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Ждём оплату",
  payment_reported: "Покупатель сообщил об оплате",
  confirmed: "Оплачено, билеты выданы",
  expired: "Бронь истекла",
  rejected: "Отклонён",
  late_payment: "Поздняя оплата",
  refunded: "Возврат",
  cancelled: "Отменён",
};

/** Buyer wording, both languages. */
export const BOOKING_STATUS_PUBLIC: Record<BookingStatus, { ru: string; kk: string }> = {
  pending: { ru: "Ожидает оплаты", kk: "Төлем күтілуде" },
  payment_reported: { ru: "Оплата проверяется", kk: "Төлем тексерілуде" },
  confirmed: { ru: "Оплачено", kk: "Төленді" },
  expired: { ru: "Бронь истекла", kk: "Бронь мерзімі өтті" },
  rejected: { ru: "Оплата не найдена", kk: "Төлем табылмады" },
  late_payment: { ru: "Оплата пришла поздно, решает кассир", kk: "Төлем кеш келді, кассир шешеді" },
  refunded: { ru: "Деньги возвращены", kk: "Ақша қайтарылды" },
  cancelled: { ru: "Отменена", kk: "Болдырылмады" },
};

export const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
  pending: "bg-blue-50 text-blue-700",
  payment_reported: "bg-orange-100 text-orange-800",
  confirmed: "bg-gold/15 text-ocean-dark",
  expired: "bg-ocean/5 text-ocean/40",
  rejected: "bg-red-50 text-red-700",
  late_payment: "bg-orange-100 text-orange-800",
  refunded: "bg-ocean/5 text-ocean/60",
  cancelled: "bg-ocean/5 text-ocean/40",
};
