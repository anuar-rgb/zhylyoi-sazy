/**
 * Storage for institution media.
 *
 * One bucket holds the photos of every section, separated by folder:
 *
 *   org-media/<organization_id>/<section>/<file>
 *
 * The FIRST segment is what the Storage policies check — a file cannot be
 * written into another institution's folder even with a valid session. The
 * second segment is for people reading the file listing, not for the policies.
 */
export const MEDIA_BUCKET = "org-media";

/**
 * Folder per admin section, named after the table the section edits.
 *
 * Adding one needs no Storage policy change: the policies check the institution
 * segment ahead of it, and this name only keeps the listing readable.
 */
export type MediaSection =
  | "culture-clubs"
  | "culture-events"
  | "culture-news"
  | "culture-staff"
  | "culture-members";

/** Builds the upload path for a new file. The name is random so two uploads never collide. */
export function mediaPath(organizationId: string, section: MediaSection, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  return `${organizationId}/${section}/${crypto.randomUUID()}.${ext}`;
}
