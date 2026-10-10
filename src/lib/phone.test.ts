import { describe, expect, it } from "vitest";
import { formatPhone, isCompletePhone, nextPhoneValue, phoneDigits } from "./phone";

describe("phone mask", () => {
  it("formats as the digits are typed", () => {
    let value = "";
    const seen: string[] = [];
    for (const digit of "7012345678") {
      value = nextPhoneValue(value, value + digit);
      seen.push(value);
    }
    expect(seen[0]).toBe("+7 (7");
    expect(seen[3]).toBe("+7 (701) 2");
    expect(seen[6]).toBe("+7 (701) 234-5");
    expect(value).toBe("+7 (701) 234-56-78");
  });

  it("ignores letters and stops at ten digits", () => {
    expect(nextPhoneValue("+7 (701", "+7 (701a")).toBe("+7 (701");
    expect(nextPhoneValue("+7 (701) 234-56-78", "+7 (701) 234-56-789")).toBe("+7 (701) 234-56-78");
  });

  it("cleans a pasted number in any usual spelling", () => {
    for (const pasted of ["+7 701 234 56 78", "87012345678", "8 (701) 234-56-78", "7012345678", "+77012345678", "7 701 234 5678"]) {
      expect(nextPhoneValue("", pasted)).toBe("+7 (701) 234-56-78");
    }
  });

  it("backspace always takes a digit away, never gets stuck on a bracket, space or dash", () => {
    // At the end: the mask never ends on a separator, so the last digit goes.
    expect(nextPhoneValue("+7 (701) 234-5", "+7 (701) 234-")).toBe("+7 (701) 234");
    expect(nextPhoneValue("+7 (7", "+7 (")).toBe("");
    // A separator alone erased in the middle would come straight back; the last digit goes instead.
    expect(nextPhoneValue("+7 (701) 2", "+7 (701)2")).toBe("+7 (701");
    expect(nextPhoneValue("+7 (701) 234-5", "+7 (701) 2345")).toBe("+7 (701) 234");
  });

  it("is complete only with all ten digits", () => {
    expect(isCompletePhone("+7 (701) 234-56-78")).toBe(true);
    expect(isCompletePhone("+7 (701) 234-56-7")).toBe(false);
    expect(isCompletePhone("")).toBe(false);
    expect(phoneDigits("+7 (701) 234-56-78")).toBe("7012345678");
    expect(formatPhone("")).toBe("");
  });
});
