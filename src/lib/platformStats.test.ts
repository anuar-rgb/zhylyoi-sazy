import { describe, expect, it } from "vitest";
import { institutionStats, parseStatPeriod, statPeriodRange, sumStats, formatTenge } from "./platformStats";

// 2026-11-14 10:00 in Atyrau.
const NOW = new Date("2026-11-14T05:00:00Z");

describe("statPeriodRange", () => {
  it("starts months and years at midnight in Atyrau", () => {
    expect(statPeriodRange("month", NOW)).toEqual({
      from: new Date("2026-10-31T19:00:00Z"),
      to: new Date("2026-11-30T19:00:00Z"),
    });
    expect(statPeriodRange("prev", NOW).from).toEqual(new Date("2026-09-30T19:00:00Z"));
    expect(statPeriodRange("year", NOW)).toEqual({
      from: new Date("2025-12-31T19:00:00Z"),
      to: new Date("2026-12-31T19:00:00Z"),
    });
    expect(statPeriodRange("all", NOW)).toEqual({ from: null, to: null });
  });

  it("goes back across a new year", () => {
    const jan = new Date("2027-01-10T05:00:00Z");
    expect(statPeriodRange("prev", jan).from).toEqual(new Date("2026-11-30T19:00:00Z"));
  });

  it("an evening of the 31st in UTC is already the next month in Atyrau", () => {
    const late = new Date("2026-10-31T20:00:00Z");
    expect(statPeriodRange("month", late).from).toEqual(new Date("2026-10-31T19:00:00Z"));
  });

  it("falls back to this month on anything unknown", () => {
    expect(parseStatPeriod("year")).toBe("year");
    expect(parseStatPeriod("x")).toBe("month");
    expect(parseStatPeriod(undefined)).toBe("month");
  });
});

describe("institutionStats", () => {
  const range = statPeriodRange("month", NOW);
  const base = { organizationId: "a", totalAmount: 3000, refundedAt: null, refundedAmount: null, tickets: 2 };

  it("counts confirmed and later refunded orders as sold, and refunds apart", () => {
    const stats = institutionStats(
      {
        bookings: [
          { ...base, status: "confirmed", confirmedAt: "2026-11-02T10:00:00Z" },
          { ...base, status: "refunded", confirmedAt: "2026-11-03T10:00:00Z", refundedAt: "2026-11-05T10:00:00Z", refundedAmount: 1500 },
          { ...base, status: "pending", confirmedAt: null },
          { ...base, status: "rejected", confirmedAt: null },
          { ...base, status: "confirmed", confirmedAt: "2026-10-20T10:00:00Z" },
        ],
        events: [],
        applications: [],
      },
      range,
      NOW
    ).get("a")!;
    expect(stats).toMatchObject({ orders: 2, tickets: 4, amount: 6000, refunds: 1, refundedAmount: 1500 });
  });

  it("counts events past in the period and every one still ahead", () => {
    const ev = { organizationId: "a", status: "published", cancelledAt: null };
    const stats = institutionStats(
      {
        bookings: [],
        events: [
          { ...ev, eventDate: "2026-11-10T14:00:00Z" },
          { ...ev, eventDate: "2026-09-10T14:00:00Z" },
          { ...ev, eventDate: "2027-02-10T14:00:00Z" },
          { ...ev, eventDate: "2026-11-20T14:00:00Z", cancelledAt: "2026-11-12T00:00:00Z" },
          { ...ev, eventDate: "2026-11-20T14:00:00Z", status: "draft" },
        ],
        applications: [{ organizationId: "a", createdAt: "2026-11-01T00:00:00Z" }],
      },
      range,
      NOW
    ).get("a")!;
    expect(stats).toMatchObject({ eventsPast: 1, eventsAhead: 1, applications: 1 });
  });

  it("adds institutions up", () => {
    const one = { orders: 1, tickets: 2, amount: 100, refunds: 0, refundedAmount: 0, eventsPast: 1, eventsAhead: 0, applications: 3 };
    expect(sumStats([one, one]).amount).toBe(200);
    expect(formatTenge(12500)).toMatch(/^12\s500 ₸$/);
  });
});
