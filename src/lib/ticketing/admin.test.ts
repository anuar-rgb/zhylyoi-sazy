import { describe, expect, it, vi } from "vitest";

// admin.ts reads through the Supabase client; only the arithmetic is under test here.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/profile", () => ({ getStaffIdentity: vi.fn() }));
vi.mock("@/lib/organization", () => ({ getSiteOrganizationId: vi.fn() }));

import { summarizeEvent, totalStats, type EventStats } from "./admin";

const order = (status: string, total: number, entered: boolean[]) => ({
  status,
  total,
  items: entered.map((checkedIn) => ({ checkedIn })),
});

describe("summarizeEvent", () => {
  it("counts only confirmed orders as sold and as revenue", () => {
    const s = summarizeEvent("e", [
      order("confirmed", 3000, [true, false]),
      order("confirmed", 1500, [false]),
      order("pending", 1500, [false]),
      order("expired", 1500, [false]),
      order("cancelled", 1500, [false, false]),
      order("refunded", 1500, [false]),
    ]);
    expect(s).toEqual({ eventId: "e", sold: 3, waiting: 1, cancelled: 3, refunded: 1, checkedIn: 1, notCame: 2, revenue: 4500 });
  });

  it("counts seats returned by a partial refund as refunds, not as sold or revenue", () => {
    const s = summarizeEvent("e", [
      { status: "confirmed", total: 1500, refunded: 500, items: [{ checkedIn: true }, { checkedIn: false }, { checkedIn: false, refunded: true }] },
    ]);
    expect(s).toMatchObject({ sold: 2, refunded: 1, checkedIn: 1, notCame: 1, revenue: 1000 });
  });

  it("is all zeros for an event nobody has bought", () => {
    expect(summarizeEvent("e", [])).toEqual({
      eventId: "e", sold: 0, waiting: 0, cancelled: 0, refunded: 0, checkedIn: 0, notCame: 0, revenue: 0,
    });
  });

  it("keeps sold = entered + not came", () => {
    const s = summarizeEvent("e", [order("confirmed", 4500, [true, true, false])]);
    expect(s.sold).toBe(s.checkedIn + s.notCame);
  });
});

describe("totalStats", () => {
  const event = (eventId: string, sold: number, checkedIn: number, revenue: number, refunded = 0): EventStats => ({
    eventId,
    sold,
    waiting: 0,
    cancelled: 0,
    refunded,
    checkedIn,
    notCame: sold - checkedIn,
    revenue,
  });

  it("adds the events up and says how many came", () => {
    const t = totalStats([event("a", 10, 8, 50000, 1), event("b", 30, 21, 90000), event("c", 0, 0, 0)]);
    expect(t).toEqual({
      events: 3,
      eventsWithSales: 2,
      sold: 40,
      checkedIn: 29,
      refunded: 1,
      revenue: 140000,
      attendance: 73,
      averageRevenue: 70000,
    });
  });

  it("has no shares to show when nothing was sold", () => {
    expect(totalStats([])).toMatchObject({ events: 0, sold: 0, attendance: null, averageRevenue: null });
  });
});
