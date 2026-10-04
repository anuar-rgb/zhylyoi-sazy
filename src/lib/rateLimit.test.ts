import { describe, expect, it } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("lets through up to the limit, then refuses", () => {
    const key = "t1";
    expect([1, 2, 3].map((i) => rateLimit(key, 3, 1000, 1000 + i))).toEqual([true, true, true]);
    expect(rateLimit(key, 3, 1000, 1010)).toBe(false);
  });

  it("recovers once the window has passed", () => {
    const key = "t2";
    rateLimit(key, 1, 1000, 5000);
    expect(rateLimit(key, 1, 1000, 5500)).toBe(false);
    expect(rateLimit(key, 1, 1000, 6200)).toBe(true);
  });

  it("counts keys separately", () => {
    rateLimit("a", 1, 1000, 9000);
    expect(rateLimit("b", 1, 1000, 9001)).toBe(true);
  });
});
