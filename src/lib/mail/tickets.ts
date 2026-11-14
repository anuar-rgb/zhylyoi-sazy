import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTicketsPdf } from "@/lib/tickets/render";
import { escapeHtml as esc, mailConfigFor, orderLink } from "./config";

/**
 * The email with the buyer's tickets, sent once the order is confirmed: a link to the order page
 * and the tickets as a PDF, in the language the order was made in.
 *
 * Sent through the booking's institution's own mailbox (organization_mail_settings, mail/config.ts).
 * A booking is claimed with one UPDATE ... WHERE tickets_emailed_at IS NULL before sending, so two
 * confirmations never send two emails; a failed send releases the claim and the payment
 * reconciliation tries again later.
 */

const TEXT = {
  ru: {
    subject: (order: string) => `Ваши билеты: заказ ${order}`,
    hello: "Здравствуйте!",
    paid: (order: string) => `Заказ ${order} оплачен. Билеты во вложении (PDF), один QR-код на каждое место.`,
    event: "Мероприятие",
    when: "Когда",
    where: "Где",
    tickets: "Билетов",
    link: "Страница заказа с билетами",
    hint: "Предъявите QR-код на входе с телефона или на распечатке. Каждый билет действует один раз.",
    refund: "Вопросы и возврат — по контактам на сайте, назовите номер заказа.",
  },
  kk: {
    subject: (order: string) => `Сіздің билеттеріңіз: ${order} тапсырысы`,
    hello: "Сәлеметсіз бе!",
    paid: (order: string) => `${order} тапсырысы төленді. Билеттер қосымшада (PDF), әр орынға бір QR-код.`,
    event: "Іс-шара",
    when: "Уақыты",
    where: "Орны",
    tickets: "Билет саны",
    link: "Билеттері бар тапсырыс беті",
    hint: "Кіреберісте QR-кодты телефоннан немесе басып шығарылған қағаздан көрсетіңіз. Әр билет бір рет қана жарамды.",
    refund: "Сұрақтар мен қайтару — сайттағы байланыс арқылы, тапсырыс нөмірін айтыңыз.",
  },
};

export type TicketEmailResult = "sent" | "skipped" | "not_configured" | "failed";

/** Sends the tickets of one booking to its buyer, once. Never throws. */
export async function sendTicketsEmail(bookingId: string): Promise<TicketEmailResult> {
  const admin = createAdminClient();
  if (!admin) return "not_configured";
  // Whose mailbox: the booking's institution's. Without one set up nothing is claimed, so the
  // reconciliation sends it once the mailbox is there.
  const { data: owner } = await admin.from("bookings").select("organization_id").eq("id", bookingId).maybeSingle();
  const cfg = await mailConfigFor(owner?.organization_id as string | undefined);
  if (!cfg) return "not_configured";

  const { data: claimed } = await admin
    .from("bookings")
    .update({ tickets_emailed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    .is("tickets_emailed_at", null)
    .not("buyer_email", "is", null)
    .select("buyer_email, buyer_locale, access_token")
    .maybeSingle();
  if (!claimed?.buyer_email) return "skipped";

  const release = () => admin.from("bookings").update({ tickets_emailed_at: null }).eq("id", bookingId);
  try {
    const lang = claimed.buyer_locale === "kk" ? "kk" : "ru";
    const rendered = await renderTicketsPdf(admin, { bookingId }, lang);
    if (!rendered) {
      await release();
      return "skipped";
    }
    const t = TEXT[lang];
    const link = orderLink(cfg.siteUrl, lang, String(claimed.access_token));
    const lines = [
      `${t.event}: ${rendered.eventTitle}`,
      `${t.when}: ${rendered.when}`,
      ...(rendered.place ? [`${t.where}: ${rendered.place}`] : []),
      `${t.tickets}: ${rendered.tickets}`,
    ];

    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName[lang], address: cfg.from },
      to: String(claimed.buyer_email),
      replyTo: cfg.replyTo,
      subject: t.subject(rendered.orderNumber),
      text: [t.hello, "", t.paid(rendered.orderNumber), "", ...lines, "", `${t.link}: ${link}`, "", t.hint, t.refund].join("\n"),
      html:
        `<div style="font-family:Arial,sans-serif;font-size:15px;color:#145888;line-height:1.5">` +
        `<p>${esc(t.hello)}</p><p>${esc(t.paid(rendered.orderNumber))}</p>` +
        `<p>${lines.map(esc).join("<br>")}</p>` +
        `<p><a href="${esc(link)}" style="color:#1D7AC0">${esc(t.link)}</a></p>` +
        `<p style="color:#555">${esc(t.hint)}<br>${esc(t.refund)}</p></div>`,
      attachments: [{ filename: `tickets-${rendered.orderNumber}.pdf`, content: Buffer.from(rendered.pdf), contentType: "application/pdf" }],
    });
    return "sent";
  } catch {
    await release();
    return "failed";
  }
}

/**
 * Confirmed orders of the last days whose email has not gone out (the mail server was down, or
 * the confirmation came before mail was set up). Called with the payment reconciliation.
 */
export async function retryTicketEmails(limit = 20): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 };
  const admin = createAdminClient();
  if (!admin) return result;
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .is("tickets_emailed_at", null)
    .not("buyer_email", "is", null)
    .gte("updated_at", since)
    .limit(limit);
  for (const row of data ?? []) {
    const outcome = await sendTicketsEmail(String(row.id));
    if (outcome === "sent") result.sent++;
    else if (outcome === "failed") result.failed++;
  }
  return result;
}
