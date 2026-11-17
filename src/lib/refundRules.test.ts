import { describe, expect, it } from "vitest";
import { BLANK, fillRefundRules, parseRefundRules } from "./refundRules";
import { CONTENT_DEFAULTS } from "./siteContent";

const values = { name: "ДК «Тест»", site: "dk-test.kz", email: "dk@test.kz", address: "г. Кульсары", percent: "" };

describe("fillRefundRules", () => {
  it("fills the card's values and leaves an unset percent blank", () => {
    const text = fillRefundRules("{name} {site} {email} {address} не более {percent}%", values);
    expect(text).toBe(`ДК «Тест» dk-test.kz dk@test.kz г. Кульсары не более ${BLANK}%`);
  });

  it("keeps only the number of a typed percent", () => {
    expect(fillRefundRules("{percent}%", { ...values, percent: " 10 % " })).toBe("10%");
  });

  it("shows a blank for an empty card value", () => {
    expect(fillRefundRules("почта {email}", { ...values, email: "  " })).toBe(`почта ${BLANK}`);
  });

  it("leaves no placeholder in the built-in text of either language", () => {
    for (const lang of ["kk", "ru"] as const) {
      const filled = fillRefundRules(CONTENT_DEFAULTS["refundRules.text"][lang], { ...values, percent: "10" });
      expect(filled).not.toMatch(/\{\w+\}/);
      expect(filled).toContain("10%");
    }
  });
});

describe("parseRefundRules", () => {
  it("tells headings, points and list items apart", () => {
    const blocks = parseRefundRules("1. ОБЩИЕ ПОЛОЖЕНИЯ\n1.1. Настоящие Правила.\n\n4.2. В заявлении:\n1) фамилия;\n2. ІС-ШАРАНЫҢ КҮШІ ЖОЙЫЛҒАН");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "paragraph", "item", "heading"]);
  });

  it("finds six sections in the built-in text of both languages", () => {
    for (const lang of ["kk", "ru"] as const) {
      expect(parseRefundRules(CONTENT_DEFAULTS["refundRules.text"][lang]).filter((b) => b.type === "heading")).toHaveLength(6);
    }
  });
});
