import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, formatEdition, parseLegalText } from "./legalDocs";

describe("parseLegalText", () => {
  const sample = [
    "ПУБЛИЧНАЯ ОФЕРТА",
    "НА ПРИОБРЕТЕНИЕ ЭЛЕКТРОННЫХ БИЛЕТОВ",
    "1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ",
    "1.1. В настоящей Оферте используются термины:",
    "«Сайт» - веб-сайт по адресу https://dk-zhylyoi.kz.",
    "«Оператор платформы», «ИП» - индивидуальный предприниматель.",
    "1. ознакомления с Афишей;",
    "2. оформления Заказа;",
    "12.1. Права и обязанности Покупателя",
    "Покупатель вправе:",
    "1. знакомиться с Афишей;",
    "РЕКВИЗИТЫ КОМПАНИИ (ИП БАЙТАН)",
    "БИК: HSBKKZKX",
    "ИИК: KZ65601A141011201781",
  ].join("\n");

  it("takes the lines before the first section as the title", () => {
    expect(parseLegalText(sample).title).toEqual(["ПУБЛИЧНАЯ ОФЕРТА", "НА ПРИОБРЕТЕНИЕ ЭЛЕКТРОННЫХ БИЛЕТОВ"]);
  });

  it("reads sections, definitions, lists and sub-headings", () => {
    expect(parseLegalText(sample).blocks).toEqual([
      { type: "section", text: "1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ" },
      { type: "paragraph", text: "1.1. В настоящей Оферте используются термины:" },
      { type: "paragraph", term: "«Сайт»", text: "веб-сайт по адресу https://dk-zhylyoi.kz." },
      { type: "paragraph", term: "«Оператор платформы», «ИП»", text: "индивидуальный предприниматель." },
      { type: "list", items: ["1. ознакомления с Афишей;", "2. оформления Заказа;"] },
      { type: "subsection", text: "12.1. Права и обязанности Покупателя" },
      { type: "paragraph", text: "Покупатель вправе:" },
      { type: "list", items: ["1. знакомиться с Афишей;"] },
      { type: "section", text: "РЕКВИЗИТЫ КОМПАНИИ (ИП БАЙТАН)" },
      { type: "paragraph", text: "БИК: HSBKKZKX" },
      { type: "paragraph", text: "ИИК: KZ65601A141011201781" },
    ]);
  });

  it("finds a title, sections and the support email in each real document", () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      const { title, blocks } = parseLegalText(doc.text);
      expect(title.length).toBeGreaterThan(0);
      expect(blocks.filter((b) => b.type === "section").length).toBeGreaterThan(10);
      expect(doc.text).toContain("anuarbekbajtanov@gmail.com");
      expect(doc.text).not.toContain("____");
      expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("formatEdition", () => {
  it("writes the edition date in both languages", () => {
    expect(formatEdition("2026-11-13", "ru")).toBe("13 ноября 2026 г.");
    expect(formatEdition("2026-11-13", "kk")).toBe("2026 жылғы 13 қараша");
  });
});
