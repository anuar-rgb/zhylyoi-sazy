"use server";

import { appendApplication, type NewApplication } from "@/lib/applications";
import { getPublicCultureClubBySlug } from "@/lib/cultureClubs";
import { getSiteOrganizationId } from "@/lib/organization";

export type ApplicationInput = NewApplication & {
  consent: boolean;
  /**
   * Which club, as it appears in the page address.
   *
   * A slug rather than an id: this arrives from the browser, and a server function is
   * a public endpoint, so an id would have to be checked against the institution
   * anyway. Looking the slug up does that check as part of the lookup.
   *
   * Absent for the ensemble card on the home page, which is not a club.
   */
  clubSlug?: string;
};

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

  // Resolved, never taken on trust. A club that belongs to another institution, is
  // hidden, or does not exist comes back as null and the application is still stored
  // under its title — losing the link is better than losing the application.
  const club = input.clubSlug ? await getPublicCultureClubBySlug(input.clubSlug) : null;

  const stored = await appendApplication(application, organizationId, club?.id ?? null);
  if (!stored) return { ok: false, error: "failed" };

  // Nothing is sent anywhere. The application waits in the admin panel, where the
  // count of new ones sits on the Заявки item in the navigation. That means somebody
  // has to open the panel to learn it arrived — a deliberate choice, not an
  // oversight, and the reason to revisit this if applications ever start waiting.
  return { ok: true };
}
