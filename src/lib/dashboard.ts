import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** null means the query failed; 0 means the table is empty. The dashboard shows these differently. */
export type Metric = { value: number | null };

export type OrganizationCard =
  | { kind: "one"; name: string; regionName: string | null; isActive: boolean }
  | { kind: "many"; total: number }
  | { kind: "none" }
  | { kind: "error" };

export type DashboardStats = {
  applicationsTotal: Metric;
  applicationsNew: Metric;
  eventsPublished: Metric;
  eventsDraft: Metric;
  newsPublished: Metric;
  newsDraft: Metric;
  clubsActive: Metric;
  organization: OrganizationCard;
};

type CountResult = { count: number | null; error: unknown };

function metric({ count, error }: CountResult): Metric {
  return { value: error ? null : (count ?? 0) };
}

/**
 * Without generated database types supabase-js leaves embedded rows loosely typed,
 * and a to-one embed can arrive as an object or as a single-element array.
 */
function regionNameOf(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (row && typeof row === "object" && "name" in row) {
    const name = (row as { name: unknown }).name;
    if (typeof name === "string") return name;
  }
  return null;
}

function organizationCard({
  data,
  count,
  error,
}: {
  data: { name: string; is_active: boolean; regions: unknown }[] | null;
  count: number | null;
  error: unknown;
}): OrganizationCard {
  if (error) return { kind: "error" };

  const total = count ?? 0;
  if (total === 0) return { kind: "none" };

  const row = data?.[0];
  if (total > 1 || !row) return { kind: "many", total };

  return {
    kind: "one",
    name: row.name,
    regionName: regionNameOf(row.regions),
    isActive: row.is_active,
  };
}

/**
 * Counters for the staff dashboard.
 *
 * Pass the organization the viewer belongs to, or null for a platform admin — who is
 * tied to no single institution and therefore sees platform-wide numbers.
 *
 * RLS is the real boundary here: these queries return only what the caller may read.
 * The organization_id filter narrows that further, it does not widen it.
 */
export const getDashboardStats = cache(
  async (organizationId: string | null): Promise<DashboardStats> => {
    const supabase = await createClient();

    // head: true asks Postgres for the count without transferring any rows.
    const countOf = (table: "applications" | "culture_events" | "culture_news" | "culture_clubs") => {
      const query = supabase.from(table).select("*", { count: "exact", head: true });
      return organizationId ? query.eq("organization_id", organizationId) : query;
    };

    // count + limit(1) in one round trip: the row fills the card, the count decides
    // whether there is exactly one institution to name.
    const organizationQuery = supabase
      .from("organizations")
      .select("name, is_active, regions(name)", { count: "exact" })
      .order("name")
      .limit(1);

    const [
      applicationsTotal,
      applicationsNew,
      eventsPublished,
      eventsDraft,
      newsPublished,
      newsDraft,
      clubsActive,
      organizations,
    ] = await Promise.all([
        countOf("applications"),
        countOf("applications").eq("status", "new"),
        countOf("culture_events").eq("status", "published"),
        countOf("culture_events").eq("status", "draft"),
        countOf("culture_news").eq("status", "published"),
        countOf("culture_news").eq("status", "draft"),
        countOf("culture_clubs").eq("is_active", true),
        organizationId ? organizationQuery.eq("id", organizationId) : organizationQuery,
      ]);

    return {
      applicationsTotal: metric(applicationsTotal),
      applicationsNew: metric(applicationsNew),
      eventsPublished: metric(eventsPublished),
      eventsDraft: metric(eventsDraft),
      newsPublished: metric(newsPublished),
      newsDraft: metric(newsDraft),
      clubsActive: metric(clubsActive),
      organization: organizationCard(organizations),
    };
  }
);
