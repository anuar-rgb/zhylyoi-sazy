import { describe, expect, it } from "vitest";
import { refundNoticeText } from "./refundNoticeText";

const event = { title: "Концерт", when: "20 ноября 2026, 19:00" };
const flat = (r: { paragraphs: string[][] }) => r.paragraphs.flat().join("\n");

describe("refundNoticeText", () => {
  it("whole order: the order, the sum and the bank's delay", () => {
    const r = refundNoticeText("ru", "DK-000123", event, { kind: "all", amount: 3000 });
    expect(r.subject).toBe("Возврат по заказу DK-000123");
    expect(flat(r)).toContain("Деньги за заказ DK-000123 (3 000 ₸) возвращены");
    expect(flat(r)).toContain("Банк обычно зачисляет");
    expect(flat(r)).toContain("«Концерт», 20 ноября 2026, 19:00");
  });

  it("part of the order: seats counted in the right form, the rest still stand", () => {
    const words = (n: number) => flat(refundNoticeText("ru", "DK-1", event, { kind: "part", amount: 1000, seats: n }));
    expect(words(1)).toContain("за 1 место");
    expect(words(3)).toContain("за 3 места");
    expect(words(5)).toContain("за 5 мест");
    expect(words(2)).toContain("остальные билеты заказа действуют");
  });

  it("free order: tickets cancelled, no money and no bank line", () => {
    const r = refundNoticeText("kk", "DK-7", event, { kind: "free" });
    expect(r.subject).toContain("DK-7");
    expect(flat(r)).toContain("ақша қайтарылмайды");
    expect(flat(r)).not.toContain("Банк");
  });

  it("no event line when the title is unknown", () => {
    const r = refundNoticeText("ru", "DK-2", { title: "", when: "" }, { kind: "all", amount: 10 });
    expect(flat(r)).not.toContain("Мероприятие:");
  });
});
