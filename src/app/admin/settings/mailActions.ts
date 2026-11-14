"use server";

import { revalidatePath } from "next/cache";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { deleteMailSettings, getMailStatus, saveMailSettings, sendTestMail, validateMailSettings } from "@/lib/mailSettings";

export type MailFormState = { ok: boolean; message: string | null };

/**
 * The institution these settings are for: the one whose site this is. Only the platform's owner
 * sets an institution's mailbox up; the institution's own staff never see or change the password.
 */
async function platformTarget(): Promise<string | null> {
  const identity = await getStaffIdentity();
  if (identity?.role !== "platform_admin") return null;
  return getSiteOrganizationId();
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveMail(_prev: MailFormState, form: FormData): Promise<MailFormState> {
  const organizationId = await platformTarget();
  if (!organizationId) return { ok: false, message: "Настраивать почту может только администратор платформы." };

  const input = {
    host: text(form, "smtp_host"),
    port: Number(text(form, "smtp_port") || "465"),
    user: text(form, "smtp_user"),
    password: typeof form.get("smtp_password") === "string" ? String(form.get("smtp_password")) : "",
    fromAddress: text(form, "from_address") || null,
    replyTo: text(form, "reply_to") || null,
  };
  const status = await getMailStatus(organizationId);
  const invalid = validateMailSettings(input, status.configured);
  if (invalid) return { ok: false, message: invalid };

  const failed = await saveMailSettings(organizationId, input);
  if (failed) return { ok: false, message: failed };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Почта сохранена. Отправьте проверочное письмо, чтобы убедиться, что она работает." };
}

export async function removeMail(): Promise<MailFormState> {
  const organizationId = await platformTarget();
  if (!organizationId) return { ok: false, message: "Настраивать почту может только администратор платформы." };
  const failed = await deleteMailSettings(organizationId);
  if (failed) return { ok: false, message: failed };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Почта отключена. Письма покупателям уходить не будут, пока её не настроят снова." };
}

export async function testMail(_prev: MailFormState, form: FormData): Promise<MailFormState> {
  const organizationId = await platformTarget();
  if (!organizationId) return { ok: false, message: "Проверять почту может только администратор платформы." };
  const result = await sendTestMail(organizationId, text(form, "test_to"));
  return { ok: result.ok, message: result.message };
}
