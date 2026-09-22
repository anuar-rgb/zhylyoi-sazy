"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteApplication, setApplicationStatus, type ApplicationStatus } from "@/lib/applications";

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
  if (ok) revalidatePath("/admin/applications");

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
  if (ok) {
    revalidatePath("/admin/applications");
    // The dashboard counts the new ones.
    revalidatePath("/admin");
  }

  return { ok };
}
