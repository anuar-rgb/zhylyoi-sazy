"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addInstitutionAdmin,
  createInstitution,
  mailAdminLink,
  newAdminLink,
  platformAdmin,
  removeInstitutionAdmin,
  updateInstitutionSite,
} from "@/lib/platform";
import { deleteMailSettings, getMailStatus, saveMailSettings, sendTestMail, validateMailSettings } from "@/lib/mailSettings";

/** What a platform form shows after a press: a message, and the password link when one was made. */
export type PlatformState = { ok: boolean; message: string | null; link?: string; linkFor?: { email: string; name: string } };

const DENIED: PlatformState = { ok: false, message: "Это может только администратор платформы." };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function refresh(id?: string) {
  revalidatePath("/admin/platform");
  if (id) revalidatePath(`/admin/platform/${id}`);
}

export async function createInstitutionAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const created = await createInstitution(ctx.admin, {
    nameKk: text(form, "name_kk"),
    nameRu: text(form, "name_ru"),
    shortKk: text(form, "short_name_kk"),
    shortRu: text(form, "short_name_ru"),
    domain: text(form, "domain"),
  });
  if (!created.ok) return { ok: false, message: created.message };
  refresh();
  redirect(`/admin/platform/${created.value}?created=1`);
}

export async function updateSiteAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const id = text(form, "id");
  const result = await updateInstitutionSite(ctx.admin, id, { domain: text(form, "domain"), isActive: form.get("is_active") === "on" });
  if (!result.ok) return { ok: false, message: result.message };
  refresh(id);
  return { ok: true, message: "Сохранено." };
}

export async function addAdminAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const id = text(form, "id");
  const email = text(form, "email").toLowerCase();
  const name = text(form, "name");
  const result = await addInstitutionAdmin(ctx.admin, id, email, name);
  if (!result.ok) return { ok: false, message: result.message };
  refresh(id);
  return {
    ok: true,
    message: "Администратор добавлен. Отправьте ему ссылку: по ней он задаст пароль. Ссылка действует сутки.",
    link: result.value,
    linkFor: { email, name },
  };
}

export async function newLinkAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const result = await newAdminLink(ctx.admin, text(form, "id"), text(form, "user_id"));
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: "Новая ссылка готова, прежняя больше не действует. Ссылка действует сутки.",
    link: result.value,
    linkFor: { email: text(form, "email"), name: text(form, "name") },
  };
}

export async function mailLinkAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const link = text(form, "link");
  // Only a link this site made for one of its institutions goes out by mail.
  if (!/^https:\/\/[a-z0-9.-]+\/login\/set-password\?token_hash=[^&\s]+&type=recovery$/.test(link)) {
    return { ok: false, message: "Ссылка повреждена. Создайте новую." };
  }
  const result = await mailAdminLink(text(form, "id"), text(form, "email"), text(form, "name"), link);
  return result.ok ? { ok: true, message: `Ссылка отправлена на ${text(form, "email")}.`, link } : { ok: false, message: result.message, link };
}

export async function removeAdminAction(id: string, userId: string): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const result = await removeInstitutionAdmin(ctx.admin, id, userId);
  if (!result.ok) return { ok: false, message: result.message };
  refresh(id);
  return { ok: true, message: "Доступ убран." };
}

// The institution's mailbox: set up here by the platform owner, never by the institution itself.

export async function saveMailAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const id = text(form, "id");
  const input = {
    host: text(form, "smtp_host"),
    port: Number(text(form, "smtp_port") || "465"),
    user: text(form, "smtp_user"),
    password: typeof form.get("smtp_password") === "string" ? String(form.get("smtp_password")) : "",
    fromAddress: text(form, "from_address") || null,
    replyTo: text(form, "reply_to") || null,
  };
  const invalid = validateMailSettings(input, (await getMailStatus(id)).configured);
  if (invalid) return { ok: false, message: invalid };
  const failed = await saveMailSettings(id, input);
  if (failed) return { ok: false, message: failed };
  refresh(id);
  return { ok: true, message: "Почта сохранена. Отправьте проверочное письмо, чтобы убедиться, что она работает." };
}

export async function removeMailAction(id: string): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const failed = await deleteMailSettings(id);
  if (failed) return { ok: false, message: failed };
  refresh(id);
  return { ok: true, message: "Почта отключена. Письма покупателям уходить не будут, пока её не настроят снова." };
}

export async function testMailAction(_prev: PlatformState, form: FormData): Promise<PlatformState> {
  const ctx = await platformAdmin();
  if (!ctx) return DENIED;
  const result = await sendTestMail(text(form, "id"), text(form, "test_to"));
  return { ok: result.ok, message: result.message };
}
