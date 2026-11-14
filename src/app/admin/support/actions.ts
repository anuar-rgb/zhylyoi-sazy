"use server";

import { revalidatePath } from "next/cache";
import {
  addSupportMessage,
  closeSupportRequest,
  createSupportRequest,
  deleteSupportRequest,
  supportContext,
  supportUploadSlots,
  type SupportResult,
} from "@/lib/support";

/** Shared by the institution's «Поддержка» and the platform's: the side comes from who is signed in. */

const DENIED = { ok: false as const, message: "Нет доступа к поддержке." };

function refresh(id?: string) {
  for (const base of ["/admin/support", "/admin/platform/support"]) {
    revalidatePath(base);
    if (id) revalidatePath(`${base}/${id}`);
  }
  revalidatePath("/admin", "layout");
}

export async function supportUploadSlotsAction(types: string[], requestId?: string): Promise<SupportResult<{ path: string; token: string }[]>> {
  const ctx = await supportContext();
  if (!ctx) return DENIED;
  return supportUploadSlots(ctx, Array.isArray(types) ? types.map(String) : [], requestId);
}

export async function createSupportRequestAction(input: { subject: string; body: string; images: string[] }): Promise<SupportResult<string>> {
  const ctx = await supportContext();
  if (!ctx) return DENIED;
  const result = await createSupportRequest(ctx, { subject: input.subject, body: input.body, images: Array.isArray(input.images) ? input.images : [] });
  if (result.ok) refresh(result.value);
  return result;
}

export async function sendSupportMessageAction(id: string, input: { body: string; images: string[] }): Promise<SupportResult> {
  const ctx = await supportContext();
  if (!ctx) return DENIED;
  const result = await addSupportMessage(ctx, String(id), { body: input.body, images: Array.isArray(input.images) ? input.images : [] });
  if (result.ok) refresh(id);
  return result;
}

export async function closeSupportRequestAction(id: string): Promise<SupportResult> {
  const ctx = await supportContext();
  if (!ctx) return DENIED;
  const result = await closeSupportRequest(ctx, String(id));
  if (result.ok) refresh(id);
  return result;
}

export async function deleteSupportRequestAction(id: string): Promise<SupportResult> {
  const ctx = await supportContext();
  if (!ctx) return DENIED;
  const result = await deleteSupportRequest(ctx, String(id));
  if (result.ok) refresh();
  return result;
}
