"use server";

import { appendApplication, type NewApplication } from "@/lib/applications";
import { getSiteOrganizationId } from "@/lib/organization";
import { notifyTelegram } from "@/lib/telegram";

export type ApplicationInput = NewApplication & { consent: boolean };

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: "consent" | "missing" | "unavailable" | "failed" };

export async function submitClubApplication(input: ApplicationInput): Promise<SubmitResult> {
  if (!input.consent) return { ok: false, error: "consent" };
  if (!input.childName.trim() || !input.parentPhone.trim() || !input.age.trim()) {
    return { ok: false, error: "missing" };
  }

  // Resolved from the slug rather than hardcoded. The insert policy also requires the
  // institution to be active, so one that has been hidden fails here, before the write.
  const organizationId = await getSiteOrganizationId();
  if (!organizationId) return { ok: false, error: "unavailable" };

  const application: NewApplication = {
    childName: input.childName.trim(),
    age: input.age.trim(),
    parentPhone: input.parentPhone.trim(),
    clubTitle: input.clubTitle,
    comment: input.comment.trim(),
  };

  const stored = await appendApplication(application, organizationId);
  if (!stored) return { ok: false, error: "failed" };

  // Only once the application is safely stored. A notification about a submission that
  // was never saved would send someone looking for a record that does not exist.
  await notifyTelegram(application);

  return { ok: true };
}
