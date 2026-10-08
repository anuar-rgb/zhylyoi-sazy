import { describe, expect, it } from "vitest";
import { formatDate, formatDateNumeric, formatDateTime, formatTime, institutionToday } from "./timeZone";

// 09:07 UTC is 14:07 in Atyrau. These hold whatever zone the machine running them is in, which is
// the point: the server on Railway is on UTC, a developer's laptop is not.
const AT = "2026-10-08T09:07:32Z";

describe("dates are shown in the institution's time", () => {
  it("date and time", () => {
    expect(formatDateTime(AT)).toBe("8 окт. 2026 г., 14:07");
    expect(formatTime(AT)).toBe("14:07");
    expect(formatTime(AT, { seconds: true })).toBe("14:07:32");
    expect(formatDateNumeric(AT)).toBe("08.10.2026");
    expect(formatDate(AT)).toBe("8 окт. 2026 г.");
  });

  it("the day turns over at local midnight, not UTC midnight", () => {
    // 19:30 UTC on the 8th is already 00:30 on the 9th in Atyrau.
    expect(institutionToday(new Date("2026-10-08T19:30:00Z"))).toBe("2026-10-09");
    expect(formatDateNumeric("2026-10-08T19:30:00Z")).toBe("09.10.2026");
  });

  it("an unreadable value shows a dash instead of 'Invalid Date'", () => {
    expect(formatDateTime("not a date")).toBe("—");
    expect(formatTime("")).toBe("—");
  });
});
