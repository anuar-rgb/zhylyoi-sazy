"use server";

import { revalidatePath } from "next/cache";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { addController, resendInvite, setControllerActive, type ControllerResult } from "@/lib/controllers";

/** Only an administrator manages controllers, and only those of their own institution. */
async function scope(): Promise<string | null> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return null;
  if (!["organization_admin", "regional_admin", "platform_admin"].includes(identity.role ?? "")) return null;
  return identity.organizationId ?? (await getSiteOrganizationId());
}

const DENIED: ControllerResult = { ok: false, message: "Недостаточно прав." };

export async function addControllerAction(name: string, email: string): Promise<ControllerResult> {
  const organizationId = await scope();
  if (!organizationId) return DENIED;
  const result = await addController(organizationId, name, email);
  revalidatePath("/admin/tickets/controllers");
  return result;
}

export async function resendInviteAction(userId: string): Promise<ControllerResult> {
  const organizationId = await scope();
  if (!organizationId) return DENIED;
  return resendInvite(organizationId, userId);
}

export async function setControllerActiveAction(userId: string, active: boolean): Promise<ControllerResult> {
  const organizationId = await scope();
  if (!organizationId) return DENIED;
  const result = await setControllerActive(organizationId, userId, active);
  revalidatePath("/admin/tickets/controllers");
  return result;
}
