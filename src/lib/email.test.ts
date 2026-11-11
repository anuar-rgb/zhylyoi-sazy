import { describe, expect, it } from "vitest";
import { isEmail, normalizeEmail } from "./email";

describe("email", () => {
  it("takes ordinary addresses, trimmed and lowercased", () => {
    expect(isEmail("name@mail.kz")).toBe(true);
    expect(isEmail("  Aigul.K@Gmail.COM ")).toBe(true);
    expect(normalizeEmail("  Aigul.K@Gmail.COM ")).toBe("aigul.k@gmail.com");
  });

  it("refuses what cannot be an address", () => {
    for (const bad of ["", "name", "name@", "@mail.kz", "name@mail", "na me@mail.kz", "a@b@c.kz", `${"a".repeat(250)}@mail.kz`]) {
      expect(isEmail(bad)).toBe(false);
    }
  });
});
