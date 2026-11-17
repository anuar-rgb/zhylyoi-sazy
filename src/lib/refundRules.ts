import type { Locale } from "@/i18n/routing";

/**
 * The institution's ticket refund rules (the lawyer's model, Тексты сайта → Правила возврата
 * билетов). The text carries {name}, {site}, {email}, {address} and {percent}; the page fills them
 * from the institution's card and its own fields, so a new institution's rules read right at once.
 * No server imports: the pure parts are tested.
 */

export const REFUND_RULES_TEXT: Record<
  Locale,
  { title: string; subtitle: (name: string) => string; approved: (approval: string) => string; contacts: string; labels: { name: string; address: string; phone: string; email: string; hours: string }; link: string }
> = {
  kk: {
    title: "Электрондық билеттерді қайтару қағидалары",
    subtitle: (name) => `${name} іс-шараларына`,
    approved: (approval) => `Мекеме басшысының ${approval} бұйрығымен бекітілген`,
    contacts: "Мекеменің байланыс деректері",
    labels: { name: "Атауы", address: "Мекенжайы", phone: "Телефон", email: "E-mail", hours: "Өтініштерді қабылдау уақыты" },
    link: "қайтару қағидаларын",
  },
  ru: {
    title: "Правила возврата электронных билетов",
    subtitle: (name) => name,
    approved: (approval) => `Утверждены приказом руководителя Учреждения от ${approval}`,
    contacts: "Контакты учреждения",
    labels: { name: "Наименование", address: "Адрес", phone: "Телефон", email: "E-mail", hours: "Время приема заявлений" },
    link: "правила возврата",
  },
};

/** Shown where a value is not filled in yet, as in the lawyer's model. */
export const BLANK = "___";

export type RefundValues = { name: string; site: string; email: string; address: string; percent: string };

/**
 * The text with its placeholders filled. The percent keeps only digits (the field asks for a number,
 * people type «10%» or «10 %» anyway); anything empty shows as a blank to fill.
 */
export function fillRefundRules(text: string, values: RefundValues): string {
  const percent = values.percent.replace(/[^\d.,]/g, "");
  const map: Record<string, string> = {
    name: values.name.trim() || BLANK,
    site: values.site.trim() || BLANK,
    email: values.email.trim() || BLANK,
    address: values.address.trim() || BLANK,
    percent: percent || BLANK,
  };
  return text.replace(/\{(name|site|email|address|percent)\}/g, (_, key: string) => map[key]);
}

export type RefundBlock = { type: "heading" | "item" | "paragraph"; text: string };

/**
 * Lines into blocks: «2. ВОЗВРАТ ПРИ ОТМЕНЕ…» (a number and capitals) is a section heading,
 * «1) …» a list item, everything else a paragraph.
 */
export function parseRefundRules(text: string): RefundBlock[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^\d+\.\s+\S/.test(line) && !/^\d+\.\d/.test(line) && line === line.toLocaleUpperCase("ru") && /\p{L}/u.test(line)) {
        return { type: "heading" as const, text: line };
      }
      if (/^\d+\)\s/.test(line)) return { type: "item" as const, text: line };
      return { type: "paragraph" as const, text: line };
    });
}
