import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTicketsPdf } from "@/lib/tickets/render";
import { INSTITUTION_TIME_ZONE } from "@/lib/timeZone";
import { mailBody, mailConfigFor, orderLink } from "./config";
import type { TicketEmailResult } from "./tickets";

/**
 * The email a buyer gets when the institution cancels or moves an event, in the language of the
 * order. A cancellation is told once the order's money went back (or its free tickets were
 * cancelled); a move carries the tickets again, with the new date on them.
 *
 * Each notice is claimed with one row in booking_notices before sending (booking, kind and, for a
 * move, the new date), so a retry never sends it twice and a second move is told again. A failed
 * send removes the row and the payment reconciliation tries again later.
 */
export type EventNoticeKind = "cancelled" | "moved";

const TEXT = {
  ru: {
    cancelledSubject: (title: string) => `Мероприятие отменено: ${title}`,
    movedSubject: (title: string) => `Мероприятие перенесено: ${title}`,
    hello: "Здравствуйте!",
    cancelled: (title: string, when: string) => `К сожалению, мероприятие «${title}» (${when}) отменено.`,
    reason: (reason: string) => `Причина: ${reason}`,
    refundedPaid: (order: string) =>
      `Деньги за заказ ${order} возвращены на карту, с которой вы платили. Банк обычно зачисляет их в течение нескольких рабочих дней.`,
    refundedFree: (order: string) => `Билеты по заказу ${order} аннулированы.`,
    sorry: "Приносим извинения.",
    moved: (title: string, from: string, to: string) => `Мероприятие «${title}» перенесено с ${from} на ${to}.`,
    stillValid: (order: string) =>
      `Ваши билеты по заказу ${order} действуют на новую дату, ничего делать не нужно. Билеты с новой датой во вложении.`,
    refundOffer: "Если новая дата вам не подходит, ответьте на это письмо или свяжитесь с Домом культуры по контактам на сайте: вернём деньги.",
    questions: "Вопросы можно задать, ответив на это письмо.",
    link: "Страница заказа",
  },
  kk: {
    cancelledSubject: (title: string) => `Іс-шара болдырылмады: ${title}`,
    movedSubject: (title: string) => `Іс-шара ауыстырылды: ${title}`,
    hello: "Сәлеметсіз бе!",
    cancelled: (title: string, when: string) => `Өкінішке қарай, «${title}» (${when}) іс-шарасы болдырылмады.`,
    reason: (reason: string) => `Себебі: ${reason}`,
    refundedPaid: (order: string) =>
      `${order} тапсырысы үшін ақша төлем жасаған картаңызға қайтарылды. Банк оны әдетте бірнеше жұмыс күні ішінде түсіреді.`,
    refundedFree: (order: string) => `${order} тапсырысы бойынша билеттердің күші жойылды.`,
    sorry: "Кешірім сұраймыз.",
    moved: (title: string, from: string, to: string) => `«${title}» іс-шарасы ${from} күнінен ${to} күніне ауыстырылды.`,
    stillValid: (order: string) =>
      `${order} тапсырысы бойынша билеттеріңіз жаңа күнге жарамды, ештеңе істеудің қажеті жоқ. Жаңа күні көрсетілген билеттер қосымшада.`,
    refundOffer: "Жаңа күн сізге сәйкес келмесе, осы хатқа жауап беріңіз немесе сайттағы байланыс арқылы Мәдениет үйіне хабарласыңыз: ақшаңызды қайтарамыз.",
    questions: "Сұрақтарыңызды осы хатқа жауап беріп қоя аласыз.",
    link: "Тапсырыс беті",
  },
};

function formatWhen(iso: string, lang: "kk" | "ru"): string {
  const tag = lang === "kk" ? "kk-KZ" : "ru-RU";
  const at = new Date(iso);
  return (
    `${at.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric", timeZone: INSTITUTION_TIME_ZONE })}, ` +
    at.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: INSTITUTION_TIME_ZONE })
  );
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Sends one notice about one booking's event, once. Never throws. */
export async function sendEventNotice(bookingId: string, kind: EventNoticeKind): Promise<TicketEmailResult> {
  const admin = createAdminClient();
  if (!admin) return "not_configured";

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, buyer_email, buyer_locale, access_token, public_order_id, total_amount, event_id, organization_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking?.buyer_email) return "skipped";
  // The booking's institution's own mailbox; nothing is claimed without one.
  const cfg = await mailConfigFor(booking.organization_id as string | null);
  if (!cfg) return "not_configured";
  const { data: event } = await admin
    .from("culture_events")
    .select("title_kk, title_ru, event_date, cancelled_at, cancel_reason, moved_from")
    .eq("id", booking.event_id)
    .maybeSingle();
  if (!event) return "skipped";

  // Told only what is true by now: the money is back, or the tickets still stand on the new date.
  if (kind === "cancelled" && (!event.cancelled_at || booking.status !== "refunded")) return "skipped";
  if (kind === "moved" && (!event.moved_from || event.cancelled_at || booking.status !== "confirmed")) return "skipped";

  const ref = kind === "moved" ? new Date(String(event.event_date)).toISOString() : "";
  const { data: claimed } = await admin
    .from("booking_notices")
    .upsert({ booking_id: bookingId, kind, ref }, { onConflict: "booking_id,kind,ref", ignoreDuplicates: true })
    .select("booking_id");
  if (!claimed || claimed.length === 0) return "skipped";
  const release = () => admin.from("booking_notices").delete().eq("booking_id", bookingId).eq("kind", kind).eq("ref", ref);

  try {
    const lang = booking.buyer_locale === "kk" ? "kk" : "ru";
    const t = TEXT[lang];
    const title = (lang === "kk" ? (text(event.title_kk) ?? text(event.title_ru)) : (text(event.title_ru) ?? text(event.title_kk))) ?? "";
    const order = String(booking.public_order_id);
    const link = { href: orderLink(cfg.siteUrl, lang, String(booking.access_token)), label: t.link };
    const reason = text(event.cancel_reason);

    let subject: string;
    let body: ReturnType<typeof mailBody>;
    let attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    if (kind === "cancelled") {
      subject = t.cancelledSubject(title);
      body = mailBody(
        [
          [t.hello],
          [t.cancelled(title, formatWhen(String(event.event_date), lang)), ...(reason ? [t.reason(reason)] : [])],
          [Number(booking.total_amount) > 0 ? t.refundedPaid(order) : t.refundedFree(order)],
          [t.sorry, t.questions],
        ],
        link
      );
    } else {
      const rendered = await renderTicketsPdf(admin, { bookingId }, lang);
      if (!rendered) {
        await release();
        return "skipped";
      }
      subject = t.movedSubject(title);
      body = mailBody(
        [
          [t.hello],
          [t.moved(title, formatWhen(String(event.moved_from), lang), formatWhen(String(event.event_date), lang))],
          [t.stillValid(order)],
          [t.refundOffer],
        ],
        link
      );
      attachments = [{ filename: `tickets-${order}.pdf`, content: Buffer.from(rendered.pdf), contentType: "application/pdf" }];
    }

    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName[lang], address: cfg.from },
      to: String(booking.buyer_email),
      replyTo: cfg.replyTo,
      subject,
      text: body.text,
      html: body.html,
      attachments,
    });
    return "sent";
  } catch {
    await release();
    return "failed";
  }
}
