import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { INSTITUTION_TIME_ZONE } from "@/lib/timeZone";
import { mailBody, mailConfigFor, orderLink } from "./config";
import { refundNoticeText, type RefundNoticeCase } from "./refundNoticeText";
import type { TicketEmailResult } from "./tickets";

/**
 * Tells the buyer that the institution returned their order, or part of it, from the order card.
 * Sent once, right after the bank agreed (or the free tickets were cancelled): the action runs once
 * per click, so there is nothing to claim. A cancelled event tells its buyers itself (eventNotice).
 * Never throws; a failed send is reported to the cashier, who can write to the buyer.
 */
export async function sendRefundNotice(bookingId: string, what: RefundNoticeCase): Promise<TicketEmailResult> {
  try {
    const admin = createAdminClient();
    if (!admin) return "not_configured";
    const { data: booking } = await admin
      .from("bookings")
      .select("buyer_email, buyer_locale, access_token, public_order_id, event_id, organization_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking?.buyer_email) return "skipped";
    const cfg = await mailConfigFor(booking.organization_id as string | null);
    if (!cfg) return "not_configured";
    const { data: event } = await admin
      .from("culture_events")
      .select("title_kk, title_ru, event_date")
      .eq("id", booking.event_id)
      .maybeSingle();

    const lang = booking.buyer_locale === "kk" ? "kk" : "ru";
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const title = event ? ((lang === "kk" ? (str(event.title_kk) ?? str(event.title_ru)) : (str(event.title_ru) ?? str(event.title_kk))) ?? "") : "";
    const tag = lang === "kk" ? "kk-KZ" : "ru-RU";
    const at = event?.event_date ? new Date(String(event.event_date)) : null;
    const when = at
      ? `${at.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric", timeZone: INSTITUTION_TIME_ZONE })}, ` +
        at.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: INSTITUTION_TIME_ZONE })
      : "";

    const words = refundNoticeText(lang, String(booking.public_order_id), { title, when }, what);
    const body = mailBody(words.paragraphs, {
      href: orderLink(cfg.siteUrl, lang, String(booking.access_token)),
      label: words.linkLabel,
    });
    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName[lang], address: cfg.from },
      to: String(booking.buyer_email),
      replyTo: cfg.replyTo,
      subject: words.subject,
      text: body.text,
      html: body.html,
    });
    return "sent";
  } catch {
    return "failed";
  }
}
