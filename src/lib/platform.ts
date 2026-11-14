import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffIdentity } from "@/lib/profile";
import { cleanDomain, normalizeHost } from "@/lib/siteHost";
import { mailBody, mailConfigFor } from "@/lib/mail/config";
import type { StatApplication, StatBooking, StatEvent } from "@/lib/platformStats";

/**
 * The platform owner's side of the admin: the institutions on the platform, their sites, their
 * admins and their mailboxes. Only the platform admin gets here; every function below is called
 * after platformAdmin() has said yes, and works through the service role, since it reaches across
 * institutions. Nothing here touches an institution's own content (events, orders, texts): that
 * stays in the institution's admin.
 */

/** The service-role client, only when the caller is the platform admin. */
export async function platformAdmin() {
  const identity = await getStaffIdentity();
  if (identity?.role !== "platform_admin") return null;
  const admin = createAdminClient();
  return admin ? { admin, identity } : null;
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export const INSTITUTION_ADMIN_ROLE = "organization_admin";

export type InstitutionAdmin = { userId: string; name: string; email: string; signedIn: boolean };

export type InstitutionRow = {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  admins: InstitutionAdmin[];
  mailConfigured: boolean;
};

/** Every auth user's email and last sign-in, for naming admins (a few pages of 200 at most). */
async function usersById(admin: Admin): Promise<Map<string, { email: string; signedIn: boolean }>> {
  const map = new Map<string, { email: string; signedIn: boolean }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    for (const u of data.users) map.set(u.id, { email: u.email ?? "", signedIn: Boolean(u.last_sign_in_at) });
    if (data.users.length < 200) break;
  }
  return map;
}

export async function listInstitutions(admin: Admin): Promise<InstitutionRow[]> {
  const [{ data: orgs }, { data: profiles }, { data: mail }, users] = await Promise.all([
    admin.from("organizations").select("id, name, name_ru, name_kk, domain, is_active, created_at").order("created_at"),
    admin.from("profiles").select("id, full_name, organization_id").eq("role", INSTITUTION_ADMIN_ROLE),
    admin.from("organization_mail_settings").select("organization_id"),
    usersById(admin),
  ]);
  const withMail = new Set((mail ?? []).map((m) => String(m.organization_id)));
  return (orgs ?? []).map((o) => ({
    id: String(o.id),
    name: String(o.name_ru ?? o.name_kk ?? o.name),
    domain: (o.domain as string | null) ?? null,
    isActive: Boolean(o.is_active),
    createdAt: String(o.created_at),
    mailConfigured: withMail.has(String(o.id)),
    admins: (profiles ?? [])
      .filter((p) => p.organization_id === o.id)
      .map((p) => {
        const user = users.get(String(p.id));
        return { userId: String(p.id), name: String(p.full_name ?? ""), email: user?.email ?? "", signedIn: user?.signedIn ?? false };
      }),
  }));
}

export async function getInstitution(admin: Admin, id: string): Promise<InstitutionRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listInstitutions(admin)).find((row) => row.id === id) ?? null;
}

/** A slug for a new institution from its domain: dk-kulsary.kz → dk-kulsary. Unique. */
async function newSlug(admin: Admin, domain: string): Promise<string> {
  const base = domain.split(".")[0].replace(/[^a-z0-9-]/g, "").slice(0, 40) || "dk";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now()}`;
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; message: string };

export async function createInstitution(
  admin: Admin,
  input: { nameKk: string; nameRu: string; shortKk: string; shortRu: string; domain: string }
): Promise<Result<string>> {
  const domain = cleanDomain(input.domain);
  if (!domain) return { ok: false, message: "Домен указан неверно, например: dk-kulsary.kz" };
  if (!input.nameKk && !input.nameRu) return { ok: false, message: "Укажите название хотя бы на одном языке." };
  const { data: taken } = await admin.from("organizations").select("id").eq("domain", domain).maybeSingle();
  if (taken) return { ok: false, message: "Этот домен уже у другого учреждения." };

  const { data, error } = await admin
    .from("organizations")
    .insert({
      name: input.nameKk || input.nameRu,
      name_kk: input.nameKk || null,
      name_ru: input.nameRu || null,
      short_name_kk: input.shortKk || null,
      short_name_ru: input.shortRu || null,
      slug: await newSlug(admin, domain),
      type: "culture_house",
      domain,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Не удалось создать учреждение." };
  return { ok: true, value: String(data.id) };
}

export async function updateInstitutionSite(admin: Admin, id: string, input: { domain: string; isActive: boolean }): Promise<Result> {
  const domain = cleanDomain(input.domain);
  if (!domain) return { ok: false, message: "Домен указан неверно, например: dk-kulsary.kz" };
  const { data: taken } = await admin.from("organizations").select("id").eq("domain", domain).neq("id", id).maybeSingle();
  if (taken) return { ok: false, message: "Этот домен уже у другого учреждения." };
  const { error, count } = await admin
    .from("organizations")
    .update({ domain, is_active: input.isActive, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) return { ok: false, message: "Не удалось сохранить." };
  return { ok: true, value: undefined };
}

/** A one-time link that lets the person choose their password, on the institution's own site. */
async function passwordLink(admin: Admin, email: string, domain: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) return null;
  return `https://${domain}/login/set-password?token_hash=${encodeURIComponent(hashed)}&type=recovery`;
}

async function findUserByEmail(admin: Admin, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Makes the person an admin of the institution and returns the link for their password. The
 * account is created if there is none; one that already works somewhere on the platform is refused.
 */
export async function addInstitutionAdmin(admin: Admin, organizationId: string, rawEmail: string, rawName: string): Promise<Result<string>> {
  const email = rawEmail.trim().toLowerCase();
  const name = rawName.trim().slice(0, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Почта администратора указана неверно." };
  const { data: org } = await admin.from("organizations").select("domain").eq("id", organizationId).maybeSingle();
  const domain = (org?.domain as string | null) ?? null;
  if (!domain) return { ok: false, message: "Сначала задайте учреждению домен." };

  let user = await findUserByEmail(admin, email);
  if (user) {
    const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profile) return { ok: false, message: "Эта почта уже используется сотрудником платформы." };
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) return { ok: false, message: "Не удалось создать учётную запись." };
    user = data.user;
  }

  const { error } = await admin
    .from("profiles")
    .insert({ id: user.id, full_name: name || null, role: INSTITUTION_ADMIN_ROLE, organization_id: organizationId, is_active: true });
  if (error) return { ok: false, message: "Не удалось назначить администратора." };

  const link = await passwordLink(admin, email, domain);
  return link ? { ok: true, value: link } : { ok: false, message: "Администратор добавлен, но ссылку создать не удалось. Нажмите «Новая ссылка»." };
}

/** The institution's admin, or null: every change to one checks this first. */
async function ownAdmin(admin: Admin, organizationId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const { data } = await admin.from("profiles").select("id, full_name, role, organization_id").eq("id", userId).maybeSingle();
  if (!data || data.role !== INSTITUTION_ADMIN_ROLE || data.organization_id !== organizationId) return null;
  const { data: user } = await admin.auth.admin.getUserById(userId);
  return user?.user?.email ? { profile: data, email: user.user.email } : null;
}

export async function newAdminLink(admin: Admin, organizationId: string, userId: string): Promise<Result<string>> {
  const found = await ownAdmin(admin, organizationId, userId);
  if (!found) return { ok: false, message: "Администратор не найден." };
  const { data: org } = await admin.from("organizations").select("domain").eq("id", organizationId).maybeSingle();
  const domain = (org?.domain as string | null) ?? null;
  if (!domain) return { ok: false, message: "У учреждения нет домена." };
  const link = await passwordLink(admin, found.email, domain);
  return link ? { ok: true, value: link } : { ok: false, message: "Не удалось создать ссылку." };
}

/** Emails the admin their link from the institution's own mailbox (once it has one). */
export async function mailAdminLink(organizationId: string, email: string, name: string, link: string): Promise<Result> {
  const cfg = await mailConfigFor(organizationId);
  if (!cfg) return { ok: false, message: "У учреждения не настроена почта: скопируйте ссылку и отправьте её сами." };
  const body = mailBody(
    [
      [name ? `Здравствуйте, ${name}!` : "Здравствуйте!"],
      [`Вам открыт доступ к панели управления сайта ${cfg.siteUrl}. Учреждение: ${cfg.institutionRu}.`],
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
      subject: "Доступ к панели управления сайта",
      text: body.text,
      html: body.html,
    });
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, message: "Письмо не отправилось: скопируйте ссылку и отправьте её сами." };
  }
}

/** Takes the admin rights away: the account stays, but no longer opens the institution's panel. */
export async function removeInstitutionAdmin(admin: Admin, organizationId: string, userId: string): Promise<Result> {
  const found = await ownAdmin(admin, organizationId, userId);
  if (!found) return { ok: false, message: "Администратор не найден." };
  const { error } = await admin.from("profiles").delete().eq("id", userId).eq("organization_id", organizationId);
  // Without a profile the panel shows nothing of the institution from the next page load on: every
  // staff read and action checks the profile (RLS current_org_id, hasProfile).
  if (error) return { ok: false, message: "Не удалось убрать доступ." };
  return { ok: true, value: undefined };
}

/** For the HTTPS certificate: whether a domain (or its www.) belongs to an institution. */
export async function isInstitutionDomain(rawDomain: string | null): Promise<boolean> {
  const domain = normalizeHost(rawDomain);
  if (!domain) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("organizations").select("id").eq("domain", domain).maybeSingle();
  return Boolean(data);
}

/** Every page of a select (the API stops at 1000 rows a request). */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[] | null> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error || !data) return null;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

export type PlatformStatsInput = {
  bookings: StatBooking[];
  events: StatEvent[];
  applications: StatApplication[];
  /** Each institution's most recent staff sign-in. */
  lastSignIn: Map<string, string>;
};

/**
 * The rows «Статистика» counts, read from the period's start on (the arithmetic is in platformStats).
 * Null when any read failed, so the page says so instead of showing zeros as if they were real.
 */
export async function platformStatsInput(admin: Admin, from: Date | null): Promise<PlatformStatsInput | null> {
  const since = from?.toISOString() ?? null;
  const [bookings, events, applications, { data: profiles }, users] = await Promise.all([
    allRows((a, b) => {
      let q = admin
        .from("bookings")
        .select("organization_id, status, total_amount, confirmed_at, refunded_at, refunded_amount, booking_items(released_at)")
        .in("status", ["confirmed", "refunded"]);
      if (since) q = q.or(`confirmed_at.gte.${since},refunded_at.gte.${since}`);
      return q.order("id").range(a, b);
    }),
    allRows((a, b) => {
      let q = admin.from("culture_events").select("organization_id, status, event_date, cancelled_at").eq("status", "published");
      if (since) q = q.gte("event_date", since);
      return q.order("id").range(a, b);
    }),
    allRows((a, b) => {
      let q = admin.from("applications").select("organization_id, created_at");
      if (since) q = q.gte("created_at", since);
      return q.order("id").range(a, b);
    }),
    admin.from("profiles").select("id, organization_id").not("organization_id", "is", null),
    lastSignIns(admin),
  ]);
  if (!bookings || !events || !applications || !profiles) return null;

  const lastSignIn = new Map<string, string>();
  for (const p of profiles) {
    const at = users.get(String(p.id));
    const org = String(p.organization_id);
    if (at && (!lastSignIn.has(org) || at > lastSignIn.get(org)!)) lastSignIn.set(org, at);
  }

  return {
    bookings: bookings.map((r) => ({
      organizationId: String(r.organization_id),
      status: String(r.status),
      totalAmount: r.total_amount === null ? null : Number(r.total_amount),
      confirmedAt: (r.confirmed_at as string | null) ?? null,
      refundedAt: (r.refunded_at as string | null) ?? null,
      refundedAmount: r.refunded_amount === null ? null : Number(r.refunded_amount),
      tickets: ((r.booking_items as { released_at: string | null }[] | null) ?? []).filter((i) => !i.released_at).length,
    })),
    events: events.map((r) => ({
      organizationId: String(r.organization_id),
      status: String(r.status),
      eventDate: (r.event_date as string | null) ?? null,
      cancelledAt: (r.cancelled_at as string | null) ?? null,
    })),
    applications: applications.map((r) => ({ organizationId: String(r.organization_id), createdAt: String(r.created_at) })),
    lastSignIn,
  };
}

/** Every auth user's last sign-in (ISO), by user id. */
async function lastSignIns(admin: Admin): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    for (const u of data.users) if (u.last_sign_in_at) map.set(u.id, u.last_sign_in_at);
    if (data.users.length < 200) break;
  }
  return map;
}
