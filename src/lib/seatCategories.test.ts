import { describe, expect, it } from "vitest";
import { categoryOptions, normalizeCategory } from "./seatCategories";

describe("normalizeCategory", () => {
  it("folds every spelling of the built-in categories into one", () => {
    for (const typed of ["вип", "ВИП", "VIP", "Vip", " vip "]) expect(normalizeCategory(typed)).toBe("vip");
    for (const typed of ["стандарт", "Стандарт", "standard", "Standart"]) expect(normalizeCategory(typed)).toBe("standard");
  });

  it("matches an existing custom category regardless of case and spaces", () => {
    expect(normalizeCategory("балкон ", ["Балкон"])).toBe("Балкон");
    expect(normalizeCategory("Ложа  А", [])).toBe("Ложа А");
  });

  it("refuses an empty name", () => {
    expect(normalizeCategory("   ")).toBeNull();
  });
});

describe("categoryOptions", () => {
  it("puts Стандарт and VIP first, then custom ones alphabetically, without duplicates", () => {
    expect(categoryOptions(["Ложа", "vip", "Балкон", "standard", "Ложа"])).toEqual(["standard", "vip", "Балкон", "Ложа"]);
  });
});
