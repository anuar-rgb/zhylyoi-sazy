import { describe, expect, it } from "vitest";
import { canCancelEvent, canMoveEvent, deleteBlockedUntil, ticketArchiveUntil } from "./eventArchive";
import { isEventLocked } from "./eventLock";

// 20:00 on 1 December 2026 at the institution (UTC+5).
const EVENT = { eventDate: "2026-12-01T15:00:00Z", endDate: null, cancelledAt: null };
const at = (iso: string) => new Date(iso).getTime();

describe("cancelling an event", () => {
  it("is allowed before and during the event's day, at the institution's time", () => {
    expect(canCancelEvent(EVENT, at("2026-11-20T10:00:00Z"))).toBe(true);
    // Halfway through the concert.
    expect(canCancelEvent(EVENT, at("2026-12-01T16:00:00Z"))).toBe(true);
    // 23:59 on 1 December in Kazakhstan is 18:59 UTC.
    expect(canCancelEvent(EVENT, at("2026-12-01T18:59:00Z"))).toBe(true);
  });

  it("is refused from the next day on, and twice", () => {
    expect(canCancelEvent(EVENT, at("2026-12-01T19:01:00Z"))).toBe(false);
    expect(canCancelEvent({ ...EVENT, cancelledAt: "2026-11-30T10:00:00Z" }, at("2026-11-30T11:00:00Z"))).toBe(false);
  });
});

describe("moving an event", () => {
  it("is allowed only before it starts and not after a cancellation", () => {
    expect(canMoveEvent(EVENT, at("2026-12-01T14:59:00Z"))).toBe(true);
    expect(canMoveEvent(EVENT, at("2026-12-01T15:01:00Z"))).toBe(false);
    expect(canMoveEvent({ ...EVENT, cancelledAt: "2026-11-30T10:00:00Z" }, at("2026-11-30T11:00:00Z"))).toBe(false);
  });
});

describe("the ticket archive", () => {
  it("keeps orders five years after the event ends", () => {
    expect(ticketArchiveUntil(EVENT).toISOString()).toBe("2031-12-01T15:00:00.000Z");
    expect(ticketArchiveUntil({ eventDate: EVENT.eventDate, endDate: "2026-12-01T17:00:00Z" }).toISOString()).toBe(
      "2031-12-01T17:00:00.000Z"
    );
  });

  it("blocks deleting an event that sold tickets until then", () => {
    expect(deleteBlockedUntil(EVENT, true, at("2027-01-01T00:00:00Z"))?.toISOString()).toBe("2031-12-01T15:00:00.000Z");
    expect(deleteBlockedUntil(EVENT, true, at("2031-12-02T00:00:00Z"))).toBeNull();
  });

  it("lets an event that never sold tickets go at once", () => {
    expect(deleteBlockedUntil(EVENT, false, at("2026-11-12T00:00:00Z"))).toBeNull();
  });
});

describe("a cancelled event", () => {
  it("is read-only like a past one", () => {
    expect(isEventLocked({ eventDate: "2099-01-01T00:00:00Z", status: "published", cancelledAt: "2026-11-12T00:00:00Z" })).toBe(true);
    expect(isEventLocked({ eventDate: "2099-01-01T00:00:00Z", status: "published", cancelledAt: null })).toBe(false);
  });
});
