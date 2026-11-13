import { describe, expect, it } from "vitest";
import { normalizeOrderNumber } from "./orderNumber";

describe("an order number typed by staff", () => {
  it("becomes the stored form however it was written", () => {
    for (const input of ["DK-000154", "dk-000154", "dk154", "DK 154", "154", "000154", " дк-154 ", "ДК154"]) {
      expect(normalizeOrderNumber(input)).toBe("DK-000154");
    }
  });

  it("keeps a number longer than six digits", () => {
    expect(normalizeOrderNumber("DK-1234567")).toBe("DK-1234567");
  });

  it("refuses what is not an order number", () => {
    for (const input of ["", "DK-", "abc", "DK-12a", "12-34"]) expect(normalizeOrderNumber(input)).toBeNull();
  });
});
