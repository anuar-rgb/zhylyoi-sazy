import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffIdentity } from "@/lib/profile";
import { mailBody, mailConfigFor } from "@/lib/mail/config";
import {
  SUPPORT_BODY_MAX,
  SUPPORT_MAX_IMAGES,
  SUPPORT_SUBJECT_MAX,
  isOwnSupportImage,
  supportImageExt,
  supportStatus,
  supportText,
  type SupportStatus,
} from "@/lib/supportRules";

/**
 * «Поддержка»: an institution's staff write to the platform owner, the conversation goes on in the
 * panel, and email only says that something new came in.
 *
 * The tables and the support-files bucket are closed to the browser (migration 20261114230000);
 * everything goes through the service role here, after supportContext() has said who is asking.
 * An institution's staff reach only their own institution's requests; the platform admin reaches
 * all of them, and only the platform admin closes or deletes.
 */

const BUCKET = "support-files";
const SIGNED_URL_SECONDS = 60 * 60;

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type SupportContext =
  | { side: "platform"; admin: Admin; userId: string; name: string }
  | { side: "institution"; admin: Admin; userId: string; name: string; organizationId: string };

export async function supportContext(): Promise<SupportContext | null> {
  const identity = await getStaffIdentity();
  if (!identity) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  if (identity.role === "platform_admin") return { side: "platform", admin, userId: identity.userId, name: identity.displayName };
  if (!identity.hasProfile || !identity.organizationId) return null;
  return { side: "institution", admin, userId: identity.userId, name: identity.displayName, organizationId: identity.organizationId };
}

export type SupportResult<T = undefined> = { ok: true; value: T } | { ok: false; message: string };

export type SupportListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  subject: string;
  status: SupportStatus;
  lastMessageAt: string;
  createdAt: string;
  /** Something new for whoever is looking. */
  unread: boolean;
};

export type SupportMessage = {
  id: string;
  fromPlatform: boolean;
  authorName: string;
  body: string;
  createdAt: string;
  images: { path: string; url: string }[];
};

export type SupportThread = SupportListItem & { messages: SupportMessage[] };

type RequestRow = {
  id: string;
  organization_id: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  platform_seen_at: string | null;
  organization_seen_at: string | null;
  organizations: { name: string; name_ru: string | null; name_kk: string | null } | null;
};

const REQUEST_COLUMNS =
  "id, organization_id, subject, status, last_message_at, created_at, platform_seen_at, organization_seen_at, organizations(name, name_ru, name_kk)";

/** New for the platform: the institution wrote after the platform last looked. And the other way. */
function isUnread(row: RequestRow, side: SupportContext["side"]): boolean {
  const status = supportStatus(row.status);
  const seen = side === "platform" ? row.platform_seen_at : row.organization_seen_at;
  const waiting = side === "platform" ? status === "open" : status === "answered";
  return waiting && (!seen || seen < row.last_message_at);
}

function listItem(row: RequestRow, side: SupportContext["side"]): SupportListItem {
  const org = row.organizations;
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: org ? String(org.name_ru ?? org.name_kk ?? org.name) : "",
    subject: row.subject,
    status: supportStatus(row.status),
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    unread: isUnread(row, side),
  };
}

export async function listSupportRequests(ctx: SupportContext): Promise<SupportListItem[] | null> {
  let q = ctx.admin.from("support_requests").select(REQUEST_COLUMNS).order("last_message_at", { ascending: false }).limit(500);
  if (ctx.side === "institution") q = q.eq("organization_id", ctx.organizationId);
  const { data, error } = await q;
  if (error || !data) return null;
  const items = (data as unknown as RequestRow[]).map((row) => listItem(row, ctx.side));
  // What waits for this side comes first, then the rest by the latest message.
  return [...items.filter((i) => i.unread), ...items.filter((i) => !i.unread)];
}

/** For the menu badge. */
export async function countUnreadSupport(ctx: SupportContext): Promise<number> {
  const items = await listSupportRequests(ctx);
  return items ? items.filter((i) => i.unread).length : 0;
}

async function ownRequest(ctx: SupportContext, id: string): Promise<RequestRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let q = ctx.admin.from("support_requests").select(REQUEST_COLUMNS).eq("id", id);
  if (ctx.side === "institution") q = q.eq("organization_id", ctx.organizationId);
  const { data } = await q.maybeSingle();
  return (data as unknown as RequestRow | null) ?? null;
}

/** One request with its messages; opening it marks it seen by this side. */
export async function getSupportThread(ctx: SupportContext, id: string): Promise<SupportThread | null> {
  const row = await ownRequest(ctx, id);
  if (!row) return null;
  const { data: messages } = await ctx.admin
    .from("support_messages")
    .select("id, author_id, from_platform, body, images, created_at")
    .eq("request_id", id)
    .order("created_at");
  const list = (messages ?? []) as { id: string; author_id: string | null; from_platform: boolean; body: string; images: string[]; created_at: string }[];

  const authorIds = [...new Set(list.map((m) => m.author_id).filter((v): v is string => Boolean(v)))];
  const { data: profiles } = authorIds.length
    ? await ctx.admin.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [String(p.id), String(p.full_name ?? "")]));

  const paths = list.flatMap((m) => m.images ?? []);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await ctx.admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  await ctx.admin
    .from("support_requests")
    .update(ctx.side === "platform" ? { platform_seen_at: new Date().toISOString() } : { organization_seen_at: new Date().toISOString() })
    .eq("id", id);

  return {
    ...listItem(row, ctx.side),
    messages: list.map((m) => ({
      id: m.id,
      fromPlatform: m.from_platform,
      authorName: (m.author_id && names.get(m.author_id)) || (m.from_platform ? "Поддержка платформы" : "Сотрудник"),
      body: m.body,
      createdAt: m.created_at,
      images: (m.images ?? []).map((path) => ({ path, url: urls.get(path) ?? "" })).filter((i) => i.url),
    })),
  };
}

/**
 * Upload slots for screenshots: the browser sends each file straight to storage with its token,
 * so a picture never passes through the page's own request (which has a 1 MB limit).
 */
export async function supportUploadSlots(
  ctx: SupportContext,
  types: string[],
  requestId?: string
): Promise<SupportResult<{ path: string; token: string }[]>> {
  if (types.length > SUPPORT_MAX_IMAGES) return { ok: false, message: `Не больше ${SUPPORT_MAX_IMAGES} картинок.` };
  let organizationId: string;
  if (ctx.side === "institution") organizationId = ctx.organizationId;
  else {
    const row = requestId ? await ownRequest(ctx, requestId) : null;
    if (!row) return { ok: false, message: "Обращение не найдено." };
    organizationId = row.organization_id;
  }
  const slots: { path: string; token: string }[] = [];
  for (const type of types) {
    const ext = supportImageExt(type);
    if (!ext) return { ok: false, message: "Картинка должна быть JPG, PNG или WEBP." };
    const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { ok: false, message: "Не удалось подготовить загрузку картинки." };
    slots.push({ path, token: data.token });
  }
  return { ok: true, value: slots };
}

function cleanImages(raw: unknown[], organizationId: string): string[] | null {
  if (raw.length > SUPPORT_MAX_IMAGES) return null;
  const paths = raw.filter((p): p is string => isOwnSupportImage(p, organizationId));
  return paths.length === raw.length ? paths : null;
}

export async function createSupportRequest(
  ctx: SupportContext,
  input: { subject: unknown; body: unknown; images: unknown[] }
): Promise<SupportResult<string>> {
  if (ctx.side !== "institution") return { ok: false, message: "Обращение пишет учреждение." };
  const subject = supportText(input.subject, SUPPORT_SUBJECT_MAX);
  if (!subject) return { ok: false, message: `Укажите тему (до ${SUPPORT_SUBJECT_MAX} знаков).` };
  const body = supportText(input.body, SUPPORT_BODY_MAX);
  if (!body) return { ok: false, message: `Опишите вопрос (до ${SUPPORT_BODY_MAX} знаков).` };
  const images = cleanImages(input.images, ctx.organizationId);
  if (!images) return { ok: false, message: "Не удалось прикрепить картинки." };

  const now = new Date().toISOString();
  const { data, error } = await ctx.admin
    .from("support_requests")
    .insert({ organization_id: ctx.organizationId, subject, created_by: ctx.userId, last_message_at: now, organization_seen_at: now })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Не удалось отправить обращение." };
  const id = String(data.id);
  const { error: msgError } = await ctx.admin
    .from("support_messages")
    .insert({ request_id: id, author_id: ctx.userId, from_platform: false, body, images, created_at: now });
  if (msgError) {
    await ctx.admin.from("support_requests").delete().eq("id", id);
    return { ok: false, message: "Не удалось отправить обращение." };
  }
  await notify(ctx, id, ctx.organizationId, subject, true);
  return { ok: true, value: id };
}

export async function addSupportMessage(
  ctx: SupportContext,
  id: string,
  input: { body: unknown; images: unknown[] }
): Promise<SupportResult> {
  const row = await ownRequest(ctx, id);
  if (!row) return { ok: false, message: "Обращение не найдено." };
  const body = supportText(input.body, SUPPORT_BODY_MAX);
  if (!body) return { ok: false, message: `Напишите сообщение (до ${SUPPORT_BODY_MAX} знаков).` };
  const images = cleanImages(input.images, row.organization_id);
  if (!images) return { ok: false, message: "Не удалось прикрепить картинки." };

  const fromPlatform = ctx.side === "platform";
  const now = new Date().toISOString();
  const { error } = await ctx.admin
    .from("support_messages")
    .insert({ request_id: id, author_id: ctx.userId, from_platform: fromPlatform, body, images, created_at: now });
  if (error) return { ok: false, message: "Не удалось отправить сообщение." };
  // The institution writing again reopens a closed request: it is waiting for an answer again.
  await ctx.admin
    .from("support_requests")
    .update({
      status: fromPlatform ? "answered" : "open",
      last_message_at: now,
      ...(fromPlatform ? { platform_seen_at: now } : { organization_seen_at: now }),
    })
    .eq("id", id);
  await notify(ctx, id, row.organization_id, row.subject, !fromPlatform);
  return { ok: true, value: undefined };
}

export async function closeSupportRequest(ctx: SupportContext, id: string): Promise<SupportResult> {
  if (ctx.side !== "platform") return { ok: false, message: "Закрывает обращение поддержка платформы." };
  const { error, count } = await ctx.admin.from("support_requests").update({ status: "closed" }, { count: "exact" }).eq("id", id);
  return error || !count ? { ok: false, message: "Не удалось закрыть обращение." } : { ok: true, value: undefined };
}

/** The whole request: its messages and their pictures, to free the space. */
export async function deleteSupportRequest(ctx: SupportContext, id: string): Promise<SupportResult> {
  if (ctx.side !== "platform") return { ok: false, message: "Удаляет обращение только поддержка платформы." };
  const row = await ownRequest(ctx, id);
  if (!row) return { ok: false, message: "Обращение не найдено." };
  const { data: messages } = await ctx.admin.from("support_messages").select("images").eq("request_id", id);
  const paths = (messages ?? []).flatMap((m) => (m.images as string[] | null) ?? []);
  if (paths.length) {
    const { error: removeError } = await ctx.admin.storage.from(BUCKET).remove(paths);
    if (removeError) return { ok: false, message: "Не удалось удалить картинки. Попробуйте ещё раз." };
  }
  const { error, count } = await ctx.admin.from("support_requests").delete({ count: "exact" }).eq("id", id);
  return error || !count ? { ok: false, message: "Не удалось удалить обращение." } : { ok: true, value: undefined };
}

/**
 * A short email that something new came in; the text itself stays in the panel. Sent through the
 * institution's own mailbox; without one, nothing is sent and the badge in the panel is the notice.
 */
async function notify(ctx: SupportContext, requestId: string, organizationId: string, subject: string, toPlatform: boolean) {
  try {
    const cfg = await mailConfigFor(organizationId);
    if (!cfg) return;
    let to: string[];
    let letter: { subject: string; paragraphs: string[][]; href: string };
    if (toPlatform) {
      const { data: owners } = await ctx.admin.from("profiles").select("id").eq("role", "platform_admin");
      to = await emailsOf(ctx.admin, (owners ?? []).map((o) => String(o.id)));
      letter = {
        subject: `Поддержка: новое сообщение от «${cfg.fromName.ru}»`,
        paragraphs: [[`${cfg.institutionRu} написал в поддержку.`], [`Тема: ${subject}`], ["Текст сообщения в панели платформы."]],
        href: `${cfg.siteUrl}/admin/platform/support/${requestId}`,
      };
    } else {
      const { data: request } = await ctx.admin.from("support_requests").select("created_by").eq("id", requestId).maybeSingle();
      const creator = request?.created_by ? String(request.created_by) : null;
      to = creator ? await emailsOf(ctx.admin, [creator]) : [];
      letter = {
        subject: "Поддержка платформы ответила на ваше обращение",
        paragraphs: [[`На ваше обращение «${subject}» пришёл ответ.`], ["Ответ в панели управления, раздел «Поддержка»."]],
        href: `${cfg.siteUrl}/admin/support/${requestId}`,
      };
    }
    if (!to.length) return;
    const body = mailBody(letter.paragraphs, { href: letter.href, label: "Открыть" });
    await nodemailer.createTransport(cfg.transport).sendMail({
      from: { name: cfg.fromName.ru, address: cfg.from },
      to,
      subject: letter.subject,
      text: body.text,
      html: body.html,
    });
  } catch {
    // The message is saved either way; the badge in the panel still shows it.
  }
}

async function emailsOf(admin: Admin, userIds: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) out.push(data.user.email);
  }
  return out;
}
