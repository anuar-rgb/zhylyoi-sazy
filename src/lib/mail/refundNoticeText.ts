/**
 * The words of the email a buyer gets when the institution returns one order (or part of it) from
 * the order card in the admin. Pure, so it is tested; refundNotice.ts sends it.
 */
export type RefundNoticeCase =
  | { kind: "all"; amount: number } // the whole order (what was left of it) went back through the bank
  | { kind: "part"; amount: number; seats: number } // some seats went back, the rest of the tickets stand
  | { kind: "free" }; // a free order's tickets were cancelled, no money moved

const money = (amount: number, lang: "kk" | "ru") => `${amount.toLocaleString(lang === "kk" ? "kk-KZ" : "ru-RU")} ₸`;

const TEXT = {
  ru: {
    subject: (order: string) => `Возврат по заказу ${order}`,
    subjectFree: (order: string) => `Билеты аннулированы: заказ ${order}`,
    hello: "Здравствуйте!",
    event: (title: string, when: string) => `Мероприятие: «${title}», ${when}.`,
    all: (order: string, sum: string) =>
      `Деньги за заказ ${order} (${sum}) возвращены на карту, с которой вы платили. Билеты по этому заказу больше не действуют.`,
    part: (order: string, sum: string, seats: number) =>
      `По заказу ${order} возвращено ${sum} за ${seats} ${seats === 1 ? "место" : seats < 5 ? "места" : "мест"} на карту, с которой вы платили. Эти билеты больше не действуют, остальные билеты заказа действуют.`,
    bank: "Банк обычно зачисляет деньги в течение нескольких рабочих дней; срок зависит от вашего банка.",
    free: (order: string) => `Билеты по заказу ${order} аннулированы. Заказ был бесплатным, поэтому деньги не возвращаются.`,
    questions: "Вопросы можно задать, ответив на это письмо.",
    link: "Страница заказа",
  },
  kk: {
    subject: (order: string) => `${order} тапсырысы бойынша қайтару`,
    subjectFree: (order: string) => `Билеттердің күші жойылды: ${order} тапсырысы`,
    hello: "Сәлеметсіз бе!",
    event: (title: string, when: string) => `Іс-шара: «${title}», ${when}.`,
    all: (order: string, sum: string) =>
      `${order} тапсырысы үшін ақша (${sum}) төлем жасаған картаңызға қайтарылды. Бұл тапсырыс бойынша билеттердің күші жойылды.`,
    part: (order: string, sum: string, seats: number) =>
      `${order} тапсырысы бойынша ${seats} орын үшін ${sum} төлем жасаған картаңызға қайтарылды. Бұл билеттердің күші жойылды, тапсырыстың қалған билеттері жарамды.`,
    bank: "Банк ақшаны әдетте бірнеше жұмыс күні ішінде түсіреді; мерзімі сіздің банкіңізге байланысты.",
    free: (order: string) => `${order} тапсырысы бойынша билеттердің күші жойылды. Тапсырыс тегін болғандықтан, ақша қайтарылмайды.`,
    questions: "Сұрақтарыңызды осы хатқа жауап беріп қоя аласыз.",
    link: "Тапсырыс беті",
  },
};

/** Subject, paragraphs and link label of the email, in the order's language. */
export function refundNoticeText(
  lang: "kk" | "ru",
  order: string,
  event: { title: string; when: string },
  what: RefundNoticeCase
): { subject: string; paragraphs: string[][]; linkLabel: string } {
  const t = TEXT[lang];
  const head = [[t.hello], ...(event.title ? [[t.event(event.title, event.when)]] : [])];
  if (what.kind === "free") {
    return { subject: t.subjectFree(order), paragraphs: [...head, [t.free(order)], [t.questions]], linkLabel: t.link };
  }
  const sum = money(what.amount, lang);
  const main = what.kind === "all" ? t.all(order, sum) : t.part(order, sum, what.seats);
  return { subject: t.subject(order), paragraphs: [...head, [main, t.bank], [t.questions]], linkLabel: t.link };
}
