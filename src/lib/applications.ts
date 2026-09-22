import { createClient } from "@/lib/supabase/server";

/** Mirrors the CHECK constraint on applications.status. */
export const APPLICATION_STATUSES = ["new", "in_progress", "completed", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** A stored application, in the shape the admin UI reads. */
export type ApplicationRecord = {
  id: string;
  createdAt: string;
  childName: string;
  age: string;
  parentPhone: string;
  /**
   * The club this application points at, when it points at a real one.
   *
   * Null for the ensemble card on the home page, which is not a culture_clubs row,
   * and for anything signed up for before the link was recorded. Grouping falls back
   * to clubTitle in that case.
   */
  clubId: string | null;
  /**
   * What the club was called at the moment of applying.
   *
   * Kept beside the link on purpose: renaming a club must not rewrite the history of
   * what people signed up for, and a deleted club would otherwise leave an
   * application with nothing to show at all.
   */
  clubTitle: string;
  comment: string;
  consent: boolean;
  status: ApplicationStatus;
  /** ISO instant of the moment it was marked processed, null while it is new. */
  processedAt: string | null;
};

/** What the public form submits. id and created_at belong to the database. */
export type NewApplication = {
  childName: string;
  age: string;
  parentPhone: string;
  clubTitle: string;
  comment: string;
};

const COLUMNS =
  "id, created_at, applicant_name, applicant_age, applicant_phone, club_id, club_title, message, " +
  "consent_given, status, processed_at";

type ApplicationRow = {
  id: string;
  created_at: string;
  applicant_name: string;
  applicant_age: string | null;
  applicant_phone: string;
  club_id: string | null;
  club_title: string | null;
  message: string | null;
  consent_given: boolean;
  status: string;
  processed_at: string | null;
};

/** Keeps the database column names from leaking into the pages that render applications. */
function toRecord(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    childName: row.applicant_name,
    age: row.applicant_age ?? "",
    parentPhone: row.applicant_phone,
    clubId: row.club_id,
    clubTitle: row.club_title ?? "",
    comment: row.message ?? "",
    consent: row.consent_given,
    status: APPLICATION_STATUSES.includes(row.status as ApplicationStatus)
      ? (row.status as ApplicationStatus)
      : "new",
    processedAt: row.processed_at,
  };
}

/**
 * Applications the caller is allowed to read.
 *
 * RLS decides that: staff see their own institution's, a platform admin sees all,
 * and an anonymous caller sees none — the anon role has INSERT but no SELECT here.
 *
 * A failed query yields an empty list rather than throwing, so one broken request
 * cannot take down the page rendering around it.
 */
export async function readAllApplications(): Promise<ApplicationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  // The long select string makes supabase-js infer a string-error type; the shape
  // is asserted here instead, as in the other data modules.
  return (data as unknown as ApplicationRow[]).map(toRecord);
}

/**
 * Stores a new application, reporting whether it was saved.
 *
 * The insert deliberately has no .select(): anon is granted INSERT but not SELECT, so
 * asking for the row back fails with "permission denied for table applications".
 * Nothing needs the row — the caller only has to know it landed.
 *
 * status, consent_given and the absent processed_* columns are exactly what the insert
 * policy checks, so they are set here rather than taken on trust from the caller.
 * id and created_at are left to the database.
 */
export async function appendApplication(
  input: NewApplication,
  organizationId: string,
  clubId: string | null
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("applications").insert({
    organization_id: organizationId,
    applicant_name: input.childName,
    applicant_age: input.age,
    applicant_phone: input.parentPhone,
    club_id: clubId,
    club_title: input.clubTitle,
    message: input.comment || null,
    consent_given: true,
    status: "new",
  });

  return !error;
}

/**
 * How many applications nobody has picked up yet.
 *
 * Feeds the badge in the admin navigation, which renders on every admin page, so it
 * asks for the count alone: head: true transfers no rows at all.
 *
 * Returns 0 when the query fails. The badge is a prompt to look, not a record — a
 * failed count must not put a number on screen that nothing stands behind, and must
 * not take the surrounding navigation down with it.
 */
export async function countNewApplications(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  return error ? 0 : (count ?? 0);
}

/**
 * Deletes one application, reporting whether it actually happened.
 *
 * A caller without rights deletes zero rows and gets no error back — RLS filters the
 * rows rather than refusing the statement. Success is therefore judged by the row
 * count, not by the absence of an error, so a silent no-op cannot pass as a deletion.
 */
export async function deleteApplication(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("applications")
    .delete({ count: "exact" })
    .eq("id", id);

  return !error && count === 1;
}

/**
 * Marks an application processed, or puts it back among the new ones.
 *
 * processed_by and processed_at travel with the status so the record says who
 * handled it and when, rather than only that somebody did. Clearing the status
 * clears them too, otherwise a returned application would keep a stale signature.
 *
 * Judged by the row count: a caller without rights updates nothing and gets no
 * error, because RLS filters rows instead of refusing the statement.
 */
export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const handled = status !== "new";

  const { error, count } = await supabase
    .from("applications")
    .update(
      {
        status,
        processed_by: handled ? (user?.id ?? null) : null,
        processed_at: handled ? new Date().toISOString() : null,
      },
      { count: "exact" }
    )
    .eq("id", id);

  return !error && count === 1;
}
