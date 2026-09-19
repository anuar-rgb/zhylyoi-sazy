import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Mirrors the role CHECK constraint on public.profiles. */
const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Администратор платформы",
  regional_admin: "Региональный администратор",
  organization_admin: "Администратор учреждения",
  editor: "Редактор",
  manager: "Менеджер",
};

export type StaffIdentity = {
  /** full_name when the profile has one, otherwise the account's email. */
  displayName: string;
  /** null when the user has no profile row yet — nothing to label. */
  roleLabel: string | null;
};

/**
 * Who the current user is, for display in the staff area. Returns null when signed out.
 *
 * Cached for the render pass, so the layout and the page it wraps share one round trip
 * instead of querying twice.
 */
export const getStaffIdentity = cache(async (): Promise<StaffIdentity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS (profiles_read_own) already limits this to the caller's own row; the filter states
  // that intent in the query too, so widening the policy later can't silently widen this read.
  // maybeSingle: a signed-in user without a profile is a normal state here, not an error —
  // profiles are created deliberately, never on sign-up.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name?.trim();

  return {
    displayName: fullName || user.email || "Сотрудник",
    // An unknown role still shows something: better a raw value than a blank badge.
    roleLabel: profile ? (ROLE_LABELS[profile.role] ?? profile.role) : null,
  };
});
