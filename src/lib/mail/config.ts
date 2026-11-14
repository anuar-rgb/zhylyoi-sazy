import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Where one institution's emails go out from: its own mailbox (organization_mail_settings, entered
 * by the platform owner), with its own name as the sender and links to its own site.
 *
 * Null when the institution has no mailbox set up (or the server has no service key): then no email
 * is attempted, exactly as before when the server had no mailbox. Never another institution's
 * mailbox: a letter from the wrong house of culture is worse than none.
 */
export type MailConfig = {
  transport: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } };
  /** The sender's address. */
  from: string;
  /** The sender's name in each language: the institution's short name. */
  fromName: { kk: string; ru: string };
  /** The institution's full name in Russian, for staff letters. */
  institutionRu: string;
  replyTo: string | undefined;
  /** https://its-domain, no trailing slash. */
  siteUrl: string;
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export async function mailConfigFor(organizationId: string | null | undefined): Promise<MailConfig | null> {
  if (!organizationId) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const [{ data: settings }, { data: organization }] = await Promise.all([
    admin
      .from("organization_mail_settings")
      .select("smtp_host, smtp_port, smtp_user, smtp_password, from_address, reply_to")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("domain, name, name_kk, name_ru, short_name_kk, short_name_ru")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);
  if (!settings || !organization) return null;

  const host = text(settings.smtp_host);
  const user = text(settings.smtp_user);
  const pass = typeof settings.smtp_password === "string" ? settings.smtp_password : null;
  const domain = text(organization.domain);
  // A mailbox without a site has nowhere to link to: the letters would carry dead links.
  if (!host || !user || !pass || !domain) return null;

  const port = Number(settings.smtp_port) || 465;
  const fullKk = text(organization.name_kk) ?? text(organization.name_ru) ?? text(organization.name) ?? "";
  const fullRu = text(organization.name_ru) ?? text(organization.name_kk) ?? text(organization.name) ?? "";
  return {
    transport: { host, port, secure: port === 465, auth: { user, pass } },
    from: text(settings.from_address) ?? user,
    fromName: {
      kk: text(organization.short_name_kk) ?? text(organization.short_name_ru) ?? fullKk,
      ru: text(organization.short_name_ru) ?? text(organization.short_name_kk) ?? fullRu,
    },
    institutionRu: fullRu,
    replyTo: text(settings.reply_to) ?? undefined,
    siteUrl: `https://${domain}`,
  };
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
