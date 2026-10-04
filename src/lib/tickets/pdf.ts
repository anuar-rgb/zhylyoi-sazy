import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

/**
 * The downloadable ticket: a PDF with one page per seat.
 *
 * Only what the buyer's own booking page already shows goes in, plus the QR (the ticket code). It
 * is a copy of the ticket, not a receipt: it carries no payment details and is not a fiscal document.
 */
export type TicketPdfTicket = {
  /** The ticket code: the content of the QR and the thing typed in at the door. */
  code: string;
  row: string;
  seat: number;
  /** The ticket type's name, e.g. "Standard". */
  type: string | null;
  /** Price paid for this seat; 0 for a free ticket. */
  price: number;
};

export type TicketPdfData = {
  organization: string;
  eventTitle: string;
  /** Already worded for the reader, e.g. "4 октября 2026 г., 19:00". */
  when: string;
  place: string | null;
  orderNumber: string;
  buyerName: string;
  currency: string;
  tickets: TicketPdfTicket[];
};

export type TicketPdfLabels = {
  ticket: string;
  rowSeat: (row: string, seat: number) => string;
  order: string;
  buyer: string;
  free: string;
  hint: string;
  code: string;
};

export type TicketPdfFonts = { regular: Uint8Array; bold: Uint8Array };

// A5 portrait, in points (1/72 inch).
const W = 420;
const H = 595;
const MARGIN = 32;

const INK = rgb(0.086, 0.137, 0.18); // #16232E, the site's text colour
const MUTED = rgb(0.4, 0.5, 0.56);
const OCEAN = rgb(0.114, 0.478, 0.753); // #1D7AC0
const OCEAN_DARK = rgb(0.078, 0.345, 0.533); // #145888
const CREAM = rgb(0.98, 0.953, 0.878); // #FAF3E0

/** Words onto lines no wider than `width`; a single word wider than a line is cut with an ellipsis. */
export function wrapText(text: string, font: PDFFont, size: number, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= width;
  // The longest start of the text that still fits with an ellipsis, found by halving: measuring a
  // long string letter by letter is slow, and event titles are typed by people.
  const clip = (s: string) => {
    if (fits(s)) return s;
    let lo = 1;
    let hi = s.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(s.slice(0, mid).trimEnd() + "…")) lo = mid;
      else hi = mid - 1;
    }
    return s.slice(0, lo).trimEnd() + "…";
  };

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next)) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = fits(word) ? word : clip(word);
    }
  }
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = clip(`${kept[maxLines - 1]} ${lines.slice(maxLines, maxLines + 1).join(" ")}`);
    return kept;
  }
  return lines;
}

function drawCentered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (W - w) / 2, y, size, font, color });
}

export async function buildTicketsPdf(
  data: TicketPdfData,
  labels: TicketPdfLabels,
  fonts: TicketPdfFonts
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // subset: only the letters used are embedded, so the file stays small
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });
  pdf.setTitle(`${data.eventTitle} · ${data.orderNumber}`);
  pdf.setProducer("Кең Жылыой");
  pdf.setCreator("Кең Жылыой");

  for (const ticket of data.tickets) {
    const page = pdf.addPage([W, H]);

    // header band
    page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: OCEAN_DARK });
    const orgLines = wrapText(data.organization, bold, 12, W - 2 * MARGIN - 70, 2);
    orgLines.forEach((l, i) =>
      page.drawText(l, { x: MARGIN, y: H - 28 - i * 15, size: 12, font: bold, color: CREAM })
    );
    const tag = labels.ticket.toUpperCase();
    page.drawText(tag, {
      x: W - MARGIN - bold.widthOfTextAtSize(tag, 11),
      y: H - 28,
      size: 11,
      font: bold,
      color: CREAM,
    });

    // event
    let y = H - 104;
    for (const l of wrapText(data.eventTitle, bold, 21, W - 2 * MARGIN, 3)) {
      page.drawText(l, { x: MARGIN, y, size: 21, font: bold, color: INK });
      y -= 26;
    }
    y -= 2;
    page.drawText(data.when, { x: MARGIN, y, size: 13, font: bold, color: OCEAN });
    y -= 18;
    if (data.place) {
      for (const l of wrapText(data.place, regular, 11, W - 2 * MARGIN, 2)) {
        page.drawText(l, { x: MARGIN, y, size: 11, font: regular, color: MUTED });
        y -= 14;
      }
    }

    // the seat
    y -= 12;
    page.drawText(labels.rowSeat(ticket.row, ticket.seat), { x: MARGIN, y, size: 20, font: bold, color: INK });
    y -= 20;
    const price = ticket.price > 0 ? `${ticket.price.toLocaleString("ru-RU")} ${data.currency === "KZT" ? "₸" : data.currency}` : labels.free;
    page.drawText([ticket.type, price].filter(Boolean).join(" · "), {
      x: MARGIN,
      y,
      size: 11,
      font: regular,
      color: MUTED,
    });

    // QR
    const png = await QRCode.toBuffer(ticket.code, { type: "png", margin: 1, width: 480, errorCorrectionLevel: "M" });
    const image = await pdf.embedPng(png);
    const qr = 190;
    const qrY = 138;
    page.drawRectangle({ x: (W - qr) / 2 - 8, y: qrY - 8, width: qr + 16, height: qr + 16, color: rgb(1, 1, 1), borderColor: CREAM, borderWidth: 2 });
    page.drawImage(image, { x: (W - qr) / 2, y: qrY, width: qr, height: qr });

    drawCentered(page, `${labels.code} ${ticket.code}`, regular, 7.5, qrY - 22, MUTED);

    // footer
    page.drawLine({ start: { x: MARGIN, y: 78 }, end: { x: W - MARGIN, y: 78 }, thickness: 0.8, color: CREAM });
    page.drawText(`${labels.order} ${data.orderNumber}`, { x: MARGIN, y: 58, size: 10, font: bold, color: INK });
    const buyer = wrapText(`${labels.buyer}: ${data.buyerName}`, regular, 10, W - 2 * MARGIN, 1)[0] ?? "";
    page.drawText(buyer, { x: MARGIN, y: 44, size: 10, font: regular, color: MUTED });
    drawCentered(page, labels.hint, regular, 8, 24, MUTED);
  }

  return pdf.save();
}
