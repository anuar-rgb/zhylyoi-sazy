"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteApplication, setApplicationStatus, markApplicationsSeen, type ApplicationStatus } from "@/lib/applications";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function removeApplication(id: string): Promise<{ ok: boolean }> {
  // Server actions are publicly reachable endpoints, so the session is re-checked here
  // rather than relying on the page-level guard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // RLS has the final say: a signed-in user may delete nothing at all, and that
  // comes back as zero rows rather than an error. Report it instead of pretending.
  const ok = await deleteApplication(id);
  // "layout", and /admin rather than the page: the badge with the count of new ones
  // lives in the admin layout, so refreshing only the applications page would leave a
  // stale number sitting in the navigation beside the corrected list.
  if (ok) revalidatePath("/admin", "layout");

  return { ok };
}

export async function markApplication(id: string, status: ApplicationStatus): Promise<{ ok: boolean }> {
  // Server actions are publicly reachable endpoints, so the session is re-checked
  // here rather than relying on the page-level guard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const ok = await setApplicationStatus(id, status);
  // Covers the list, the dashboard counters and the badge in the layout in one call.
  if (ok) revalidatePath("/admin", "layout");

  return { ok };
}

/**
 * Clears the red dot: called once, client-side, when the applications list has
 * actually rendered in the browser (see markApplicationsSeen for why not sooner).
 */
export async function markSeen(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const ok = await markApplicationsSeen();
  if (ok) revalidatePath("/admin", "layout");

  return { ok };
}
