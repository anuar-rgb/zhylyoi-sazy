import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TicketPdfFonts } from "./pdf";

let cached: Promise<TicketPdfFonts> | null = null;

/** The ticket's fonts (Montserrat, SIL Open Font License, see src/assets/fonts/OFL.txt), read once. */
export function loadTicketFonts(): Promise<TicketPdfFonts> {
  cached ??= Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Montserrat-Regular.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Montserrat-Bold.ttf")),
  ]).then(([regular, bold]) => ({ regular, bold }));
  // A failed read must not be remembered for ever.
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
