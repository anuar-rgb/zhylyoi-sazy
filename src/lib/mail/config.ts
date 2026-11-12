import "server-only";

/**
 * The institution's mailbox, from the server's environment (SMTP_*; on this site the ps.kz mail
 * hosting in Kazakhstan). Null when mail is not set up, and then no email is attempted.
 */
export function mailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465) || 465;
  return {
    transport: { host, port, secure: port === 465, auth: { user, pass } },
    from: user,
    replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined,
    siteUrl: (process.env.SITE_URL ?? "https://dk-zhylyoi.kz").replace(/\/$/, ""),
  };
}

export function mailConfigured(): boolean {
  return mailConfig() !== null;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The buyer's order page. Kazakh is the default language and has no prefix in the address (i18n/routing.ts). */
export function orderLink(siteUrl: string, lang: "kk" | "ru", token: string): string {
  return `${siteUrl}${lang === "kk" ? "" : "/ru"}/my-ticket/${token}`;
}

/** One email's body as plain text and as simple HTML, from its paragraphs. */
export function mailBody(paragraphs: string[][], link?: { href: string; label: string }) {
  const text = [...paragraphs.map((lines) => lines.join("\n")), ...(link ? [`${link.label}: ${link.href}`] : [])].join("\n\n");
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#145888;line-height:1.5">` +
    paragraphs.map((lines) => `<p>${lines.map(escapeHtml).join("<br>")}</p>`).join("") +
    (link ? `<p><a href="${escapeHtml(link.href)}" style="color:#1D7AC0">${escapeHtml(link.label)}</a></p>` : "") +
    `</div>`;
  return { text, html };
}
