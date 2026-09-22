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
  "id, created_at, applicant_name, applicant_age, applicant_phone, club_title, message, consent_given, " +
  "status, processed_at";

type ApplicationRow = {
  id: string;
  created_at: string;
  applicant_name: string;
  applicant_age: string | null;
  applicant_phone: string;
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
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("applications").insert({
    organization_id: organizationId,
    applicant_name: input.childName,
    applicant_age: input.age,
    applicant_phone: input.parentPhone,
    club_title: input.clubTitle,
    message: input.comment || null,
    consent_given: true,
    status: "new",
  });

  return !error;
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
