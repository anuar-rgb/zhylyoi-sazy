import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailBody, mailConfigFor } from "@/lib/mail/config";

/** What the admin may know about an institution's mailbox: never the password. */
export type MailStatus = {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  updatedAt: string | null;
};

const EMPTY: MailStatus = { configured: false, host: null, port: null, user: null, fromAddress: null, replyTo: null, updatedAt: null };

export async function getMailStatus(organizationId: string): Promise<MailStatus> {
  const admin = createAdminClient();
  if (!admin) return EMPTY;
  const { data } = await admin
    .from("organization_mail_settings")
    .select("smtp_host, smtp_port, smtp_user, from_address, reply_to, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) return EMPTY;
  return {
    configured: true,
    host: data.smtp_host as string,
    port: Number(data.smtp_port),
    user: data.smtp_user as string,
    fromAddress: (data.from_address as string | null) ?? null,
    replyTo: (data.reply_to as string | null) ?? null,
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

export type MailSettingsInput = {
  host: string;
  port: number;
  user: string;
  /** Empty keeps the stored one. */
  password: string;
  fromAddress: string | null;
  replyTo: string | null;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/** Checks the form; the message to show, or null when it is fine. */
export function validateMailSettings(input: MailSettingsInput, hasStoredPassword: boolean): string | null {
  if (!HOST.test(input.host)) return "Сервер почты указан неверно, например: mail.ps.kz";
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) return "Порт — число, обычно 465.";
  if (input.user.length < 3) return "Укажите логин почты (обычно сам адрес).";
  if (!input.password && !hasStoredPassword) return "Укажите пароль от почты.";
  if (input.fromAddress && !EMAIL.test(input.fromAddress)) return "Адрес отправителя указан неверно.";
  if (input.replyTo && !EMAIL.test(input.replyTo)) return "Адрес для ответов указан неверно.";
  return null;
}

export async function saveMailSettings(organizationId: string, input: MailSettingsInput): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return "На сервере не задан служебный ключ.";
  const row: Record<string, unknown> = {
    organization_id: organizationId,
    smtp_host: input.host.toLowerCase(),
    smtp_port: input.port,
    smtp_user: input.user,
    from_address: input.fromAddress,
    reply_to: input.replyTo,
    updated_at: new Date().toISOString(),
  };
  if (input.password) row.smtp_password = input.password;
  const { error } = input.password
    ? await admin.from("organization_mail_settings").upsert(row, { onConflict: "organization_id" })
    : await admin.from("organization_mail_settings").update(row).eq("organization_id", organizationId);
  return error ? "Не удалось сохранить настройки почты." : null;
}

export async function deleteMailSettings(organizationId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return "На сервере не задан служебный ключ.";
  const { error } = await admin.from("organization_mail_settings").delete().eq("organization_id", organizationId);
  return error ? "Не удалось отключить почту." : null;
}

/**
 * Sends a short letter through the institution's mailbox, to see the settings work. The SMTP
 * server's own complaint is shown (wrong password, wrong port), never the password.
 */
export async function sendTestMail(organizationId: string, to: string): Promise<{ ok: boolean; message: string }> {
  if (!EMAIL.test(to)) return { ok: false, message: "Укажите адрес, куда отправить проверочное письмо." };
  const cfg = await mailConfigFor(organizationId);
  if (!cfg) return { ok: false, message: "Почта не настроена (или у учреждения не задан домен сайта)." };
  const body = mailBody([
    ["Здравствуйте!"],
    [`Это проверочное письмо с сайта ${cfg.siteUrl}. Если вы его видите, почта учреждения настроена верно: билеты и уведомления покупателям будут уходить с адреса ${cfg.from}.`],
  ]);
  try {
    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName.ru, address: cfg.from },
      to,
      replyTo: cfg.replyTo,
      subject: "Проверка почты сайта",
      text: body.text,
      html: body.html,
    });
    return { ok: true, message: `Письмо отправлено на ${to}. Проверьте ящик (и папку «Спам»).` };
  } catch (e) {
    const reason = e instanceof Error ? e.message.replace(cfg.transport.auth.pass, "***").slice(0, 200) : "";
    return { ok: false, message: `Письмо не отправилось${reason ? `: ${reason}` : ""}.` };
  }
}
