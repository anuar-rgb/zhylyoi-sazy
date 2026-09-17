"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteApplication } from "@/lib/applications";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function removeApplication(id: string): Promise<void> {
  // Server actions are publicly reachable endpoints, so the session is re-checked here
  // rather than relying on the page-level guard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await deleteApplication(id);
  revalidatePath("/admin/applications");
}
