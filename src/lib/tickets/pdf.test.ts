import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildTicketsPdf, wrapText, type TicketPdfData, type TicketPdfLabels } from "./pdf";

const fonts = {
  regular: readFileSync(join(process.cwd(), "src/assets/fonts/Montserrat-Regular.ttf")),
  bold: readFileSync(join(process.cwd(), "src/assets/fonts/Montserrat-Bold.ttf")),
};

const labels: TicketPdfLabels = {
  ticket: "Билет",
  rowSeat: (row, seat) => `Ряд ${row}, место ${seat}`,
  order: "Заказ",
  buyer: "Покупатель",
  free: "бесплатно",
  hint: "Предъявите QR-код на входе.",
  code: "Код:",
};

const data = (over: Partial<TicketPdfData> = {}): TicketPdfData => ({
  organization: "Дом культуры «Кен Жылыой» Жылыойского района",
  eventTitle: "Отчётный концерт «Жылыой сазы»",
  when: "4 октября 2026 г., 19:00",
  place: "Кульсары, проспект Махамбет, 37",
  orderNumber: "DK-000154",
  buyerName: "Айгерім Нұрғалиева",
  currency: "KZT",
  tickets: [
    { code: "3f5599b8-0652-4b06-b09a-ec19d77fd4f7", row: "3", seat: 5, type: "Standard", price: 1500 },
    { code: "aabba6c5-ec2b-4c7c-9132-e6bf737e496c", row: "3", seat: 6, type: "Standard", price: 0 },
  ],
  ...over,
});

describe("buildTicketsPdf", () => {
  it("makes a PDF with one page per seat", async () => {
    const bytes = await buildTicketsPdf(data(), labels, fonts);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });

  it("handles Kazakh letters, the tenge sign and a very long title and name without failing", async () => {
    const long = "Өте ұзын атау ".repeat(30);
    const bytes = await buildTicketsPdf(
      data({ eventTitle: long, buyerName: long, place: long, organization: long, tickets: [{ code: "aabba6c5-ec2b-4c7c-9132-e6bf737e496c", row: "Ә", seat: 12, type: "Ұлттық", price: 12500 }] }),
      labels,
      fonts
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("works without a place", async () => {
    const bytes = await buildTicketsPdf(data({ place: null }), labels, fonts);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("keeps the file small by embedding only the letters it uses", async () => {
    const bytes = await buildTicketsPdf(data(), labels, fonts);
    expect(bytes.length).toBeLessThan(400_000);
  });
});

describe("the font covers everything the ticket can say", () => {
  const sample =
    "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя ӘәҒғҚқҢңӨөҰұҮүҺһІі ₸«»№—·…0123456789";
  for (const [name, file] of [["regular", fonts.regular], ["bold", fonts.bold]] as const) {
    it(`${name} has no missing letters`, () => {
      const font = fontkit.create(file as Buffer);
      const missing = [...sample].filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)!));
      expect(missing).toEqual([]);
    });
  }
});

describe("wrapText", () => {
  it("never produces more lines than allowed, and ends a cut line with an ellipsis", async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fonts.regular);
    const lines = wrapText("слово ".repeat(80), font, 12, 200, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    for (const line of lines) expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(200 + 1);
  });

  it("cuts a single word that is wider than the line", async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fonts.regular);
    const [line] = wrapText("Ш".repeat(200), font, 12, 100, 1);
    expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(101);
  });
});

describe("the QR on the ticket", () => {
  it("is read back by the same decoder the door scanner uses", async () => {
    const code = "3f5599b8-0652-4b06-b09a-ec19d77fd4f7";
    // exactly the parameters buildTicketsPdf uses
    const png = await QRCode.toBuffer(code, { type: "png", margin: 1, width: 480, errorCorrectionLevel: "M" });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    expect(decoded?.data).toBe(code);
  });
});
