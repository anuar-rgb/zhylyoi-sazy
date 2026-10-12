import { describe, expect, it } from "vitest";
import { isEventLocked } from "./eventLock";

const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe("isEventLocked", () => {
  it("locks every event whose start has passed, a draft too", () => {
    expect(isEventLocked({ eventDate: past, status: "published" })).toBe(true);
    expect(isEventLocked({ eventDate: past, status: "draft" })).toBe(true);
  });

  it("locks an archived event even before its date", () => {
    expect(isEventLocked({ eventDate: future, status: "archived" })).toBe(true);
  });

  it("leaves an upcoming event editable, a draft or published one", () => {
    expect(isEventLocked({ eventDate: future, status: "published" })).toBe(false);
    expect(isEventLocked({ eventDate: future, status: "draft" })).toBe(false);
  });
});
