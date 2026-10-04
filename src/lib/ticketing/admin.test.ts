import { describe, expect, it, vi } from "vitest";

// admin.ts reads through the Supabase client; only the arithmetic is under test here.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/profile", () => ({ getStaffIdentity: vi.fn() }));
vi.mock("@/lib/organization", () => ({ getSiteOrganizationId: vi.fn() }));

import { summarizeEvent } from "./admin";

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
