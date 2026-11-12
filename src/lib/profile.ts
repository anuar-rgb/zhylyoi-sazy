import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Mirrors the role CHECK constraint on public.profiles.
 *
 * Three staff roles by design: the platform owner, one administrator per region, one per
 * institution. There is no "prepares but cannot publish" role — whoever holds a
 * staff profile does everything within their scope.
 *
 * And the door: a controller (CONTROLLER_ROLE) only checks tickets at /door. To the staff area
 * a controller is not staff at all — getStaffIdentity reports no profile, the admin layout sends
 * them to /door, and the database refuses them through is_staff_of.
 */
const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Администратор платформы",
  regional_admin: "Администратор области",
  organization_admin: "Администратор учреждения",
  controller: "Контролёр",
};

export const CONTROLLER_ROLE = "controller";

export type StaffIdentity = {
  /** The account's id, for journals that record who did what. */
  userId: string;
  /** full_name when the profile has one, otherwise the account's email. */
  displayName: string;
  /** null when the user has no profile row yet — nothing to label. */
  roleLabel: string | null;
  /** The raw role, for deciding what the interface offers. Null without a profile. */
  role: string | null;
  /** null for a platform admin, who belongs to no single institution. */
  organizationId: string | null;
  /** false when the signed-in account has no row in public.profiles. */
  hasProfile: boolean;
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
    .select("full_name, role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name?.trim();

  return {
    userId: user.id,
    displayName: fullName || user.email || "Сотрудник",
    // An unknown role still shows something: better a raw value than a blank badge.
    roleLabel: profile ? (ROLE_LABELS[profile.role] ?? profile.role) : null,
    role: profile?.role ?? null,
    organizationId: profile?.organization_id ?? null,
    // A failed query reads as "no profile" too. That errs toward the setup notice
    // rather than a dashboard of zeros that would look like real data. A controller is no
    // staff here: every admin action that checks hasProfile refuses them.
    hasProfile: Boolean(profile) && profile?.role !== CONTROLLER_ROLE,
  };
});

export type DoorIdentity = {
  userId: string;
  displayName: string;
  /** The institution whose tickets this person checks; null for a platform admin (the site's own then). */
  organizationId: string | null;
  isController: boolean;
};

/**
 * Who may work at the door (/door): an active controller, or any staff member. Null otherwise,
 * including a controller whose access was switched off.
 */
export const getDoorIdentity = cache(async (): Promise<DoorIdentity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organization_id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.is_active === false) return null;
  return {
    userId: user.id,
    displayName: profile.full_name?.trim() || user.email || "Сотрудник",
    organizationId: profile.organization_id ?? null,
    isController: profile.role === CONTROLLER_ROLE,
  };
});
