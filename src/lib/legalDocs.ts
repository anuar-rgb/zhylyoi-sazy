import offer from "@/content/legal/offer";
import terms from "@/content/legal/terms";
import privacy from "@/content/legal/privacy";
import type { Locale } from "@/i18n/routing";

/**
 * The platform's public documents: the ticket offer, the terms of use and the privacy policy of
 * ИП БАЙТАН, the platform's operator. One text, in Russian, for the whole platform.
 *
 * `version` is the date of the edition. It is stored with every order (the offer and the policy) and
 * every club application (the policy), so it can be shown later which text a person accepted. A new
 * edition from the lawyer replaces the text in src/content/legal and gets a new version here.
 */
export type LegalDocId = "offer" | "terms" | "privacy";

export type LegalDoc = {
  id: LegalDocId;
  /** The page's address, the same in both languages. */
  href: `/${string}`;
  /** Date of the edition, YYYY-MM-DD. */
  version: string;
  title: Record<Locale, string>;
  text: string;
};

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  offer: {
    id: "offer",
    href: "/offer",
    version: "2026-11-14",
    title: { kk: "Жария оферта", ru: "Публичная оферта" },
    text: offer,
  },
  terms: {
    id: "terms",
    href: "/terms",
    version: "2026-11-14",
    title: { kk: "Пайдаланушы келісімі", ru: "Пользовательское соглашение" },
    text: terms,
  },
  privacy: {
    id: "privacy",
    href: "/privacy",
    version: "2026-11-14",
    title: { kk: "Құпиялылық саясаты", ru: "Политика конфиденциальности" },
    text: privacy,
  },
};

export type LegalBlock =
  | { type: "section"; text: string }
  | { type: "subsection"; text: string }
  | { type: "paragraph"; text: string; term?: string }
  | { type: "list"; items: string[] };

/**
 * The lawyer's plain text as blocks to render. The text keeps Word's numbering as typed, so its
 * shape is read from the lines themselves:
 * - a line with no lowercase letters and no colon is a section heading («1. ТЕРМИНЫ…», «РЕКВИЗИТЫ…»);
 * - a short numbered clause with no closing punctuation is a sub-heading («12.1. Права и обязанности…»);
 * - «1. …», «2. …» in a row are one list;
 * - «"Term" - meaning» is a definition, its term set apart;
 * - anything else is a paragraph.
 * The first lines up to the first section are the document's title.
 */
export function parseLegalText(text: string): { title: string[]; blocks: LegalBlock[] } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title: string[] = [];
  const blocks: LegalBlock[] = [];
  let started = false;

  for (const line of lines) {
    // A colon marks a requisite («БИК: HSBKKZKX»), which is all capitals too.
    const isHeading = !/[a-zа-яёәғқңөұүһі]/.test(line) && /[A-ZА-ЯЁ]/.test(line) && !line.includes(":");
    if (!started) {
      if (isHeading && /^\d+\.\s/.test(line)) started = true;
      else {
        title.push(line);
        continue;
      }
    }
    if (isHeading) {
      blocks.push({ type: "section", text: line });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(line);
      else blocks.push({ type: "list", items: [line] });
      continue;
    }
    if (/^\d+(\.\d+)+\.\s/.test(line) && line.length < 80 && !/[.;:,]$/.test(line)) {
      blocks.push({ type: "subsection", text: line });
      continue;
    }
    const definition = line.match(/^(«[^»]+»(?:,\s*«[^»]+»)*)\s+[-–—]\s+/);
    if (definition) {
      blocks.push({ type: "paragraph", term: definition[1], text: line.slice(definition[0].length) });
      continue;
    }
    blocks.push({ type: "paragraph", text: line });
  }
  return { title, blocks };
}

/** «13 ноября 2026 г.» / «2026 жылғы 13 қараша» for a YYYY-MM-DD version. */
export function formatEdition(version: string, locale: Locale): string {
  const [y, m, d] = version.split("-").map(Number);
  const months = {
    ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    kk: ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"],
  };
  return locale === "kk" ? `${y} жылғы ${d} ${months.kk[m - 1]}` : `${d} ${months.ru[m - 1]} ${y} г.`;
}
