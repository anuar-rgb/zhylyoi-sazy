import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTROLLER_ROLE } from "@/lib/profile";
import { mailBody, mailConfigFor } from "@/lib/mail/config";

/**
 * Controllers of one institution: accounts that only check tickets at /door.
 *
 * An account is made by the server's key without a password; the person gets an email with a link
 * (valid one day) where they choose the password themselves, so nobody else ever knows it. Turning
 * access off bans the account in Auth and marks the profile inactive; turning it on lifts both.
 */
export type Controller = { id: string; name: string; email: string; active: boolean; signedIn: boolean };

export async function listControllers(organizationId: string): Promise<Controller[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("organization_id", organizationId)
    .eq("role", CONTROLLER_ROLE)
    .order("full_name", { ascending: true });
  const controllers: Controller[] = [];
  for (const row of data ?? []) {
    const { data: found } = await admin.auth.admin.getUserById(String(row.id));
    controllers.push({
      id: String(row.id),
      name: String(row.full_name ?? ""),
      email: found?.user?.email ?? "",
      active: row.is_active !== false,
      signedIn: Boolean(found?.user?.last_sign_in_at),
    });
  }
  return controllers;
}

export type ControllerResult = { ok: boolean; message: string };

async function findUserByEmail(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Emails the person a link to choose their password, from their institution's own mailbox and site. */
async function sendInvite(organizationId: string, email: string, name: string): Promise<boolean> {
  const cfg = await mailConfigFor(organizationId);
  const admin = createAdminClient();
  if (!cfg || !admin) return false;
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) return false;
  const link = `${cfg.siteUrl}/login/set-password?token_hash=${encodeURIComponent(hashed)}&type=recovery`;
  const body = mailBody(
    [
      [name ? `Здравствуйте, ${name}!` : "Здравствуйте!"],
      [`Вам открыт доступ к проверке билетов на входе в зал. Учреждение: ${cfg.institutionRu}.`],
      ["Перейдите по ссылке и придумайте пароль. Ссылка действует сутки и только один раз."],
      [`Потом входите на ${cfg.siteUrl}/login: почта ${email} и ваш пароль.`],
    ],
    { href: link, label: "Задать пароль" }
  );
  try {
    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName.ru, address: cfg.from },
      to: email,
      replyTo: cfg.replyTo,
      subject: "Доступ к проверке билетов",
      text: body.text,
      html: body.html,
    });
    return true;
  } catch {
    return false;
  }
}

export async function addController(organizationId: string, name: string, rawEmail: string): Promise<ControllerResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "На сервере не задан служебный ключ." };
  const email = rawEmail.trim().toLowerCase();
  const fullName = name.trim().slice(0, 120);
  if (!fullName) return { ok: false, message: "Укажите имя." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Проверьте почту." };

  let user = await findUserByEmail(admin, email);
  if (user) {
    const { data: profile } = await admin.from("profiles").select("role, organization_id").eq("id", user.id).maybeSingle();
    if (profile) {
      return {
        ok: false,
        message:
          profile.role === CONTROLLER_ROLE && profile.organization_id === organizationId
            ? "Этот контролёр уже есть в списке."
            : "Эта почта уже используется другим сотрудником.",
      };
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) return { ok: false, message: "Не удалось создать учётную запись." };
    user = data.user;
  }

  const { error } = await admin
    .from("profiles")
    .insert({ id: user.id, full_name: fullName, role: CONTROLLER_ROLE, organization_id: organizationId, is_active: true });
  if (error) return { ok: false, message: "Не удалось сохранить контролёра." };

  const sent = await sendInvite(organizationId, email, fullName);
  return sent
    ? { ok: true, message: `Контролёр добавлен. На ${email} отправлено письмо со ссылкой для пароля.` }
    : { ok: true, message: "Контролёр добавлен, но письмо не отправилось. Нажмите «Отправить ссылку ещё раз»." };
}

/** The controller of this institution, or null: every change checks this first. */
async function ownController(organizationId: string, userId: string) {
  const admin = createAdminClient();
  if (!admin || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const { data } = await admin.from("profiles").select("id, full_name, role, organization_id").eq("id", userId).maybeSingle();
  if (!data || data.role !== CONTROLLER_ROLE || data.organization_id !== organizationId) return null;
  return { admin, profile: data };
}

export async function resendInvite(organizationId: string, userId: string): Promise<ControllerResult> {
  const found = await ownController(organizationId, userId);
  if (!found) return { ok: false, message: "Контролёр не найден." };
  const { data } = await found.admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return { ok: false, message: "У контролёра нет почты." };
  return (await sendInvite(organizationId, email, String(found.profile.full_name ?? "")))
    ? { ok: true, message: `Письмо со ссылкой отправлено на ${email}.` }
    : { ok: false, message: "Письмо не отправилось. Попробуйте позже." };
}

export async function setControllerActive(organizationId: string, userId: string, active: boolean): Promise<ControllerResult> {
  const found = await ownController(organizationId, userId);
  if (!found) return { ok: false, message: "Контролёр не найден." };
  const { error: banError } = await found.admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  if (banError) return { ok: false, message: "Не удалось изменить доступ." };
  const { error } = await found.admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, message: "Не удалось изменить доступ." };
  return { ok: true, message: active ? "Доступ включён." : "Доступ выключен: войти контролёр больше не сможет." };
}
