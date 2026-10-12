/**
 * When an event stops being editable. Plain functions with no server imports, so client
 * components and tests can use them as well as the pages and server actions.
 */
type EventLike = { eventDate: string; status: string };

/** True once the event has started: ticket sales are closed from that moment, as on the public listing. */
export function hasEventStarted(event: Pick<EventLike, "eventDate">): boolean {
  return new Date(event.eventDate).getTime() < Date.now();
}

/**
 * Read-only from here on: the event has started (a draft too) or is archived. Its card, prices,
 * seats and payments are history now; staff can look and delete it, nothing else. The admin
 * pages hide the controls and every server action that changes an event checks this again.
 */
export function isEventLocked(event: EventLike): boolean {
  return event.status === "archived" || hasEventStarted(event);
}

export const EVENT_LOCKED_MESSAGE = "Мероприятие прошло или в архиве: его можно только просматривать.";
