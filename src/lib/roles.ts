/**
 * Staff roles, mirroring the CHECK constraint on public.profiles.
 *
 * This file only decides what the interface offers. The database decides what is
 * allowed: the *_staff_update_drafts policies let an editor touch drafts only, and
 * the insert policies refuse a published row from the same roles. Keeping the two
 * in step means the form does not offer a button that is going to fail.
 */
export const PUBLISHING_ROLES = ["platform_admin", "regional_admin", "organization_admin"] as const;

/** Whether this role may set a record to published, or edit one that already is. */
export function canPublish(role: string | null): boolean {
  return role !== null && (PUBLISHING_ROLES as readonly string[]).includes(role);
}
