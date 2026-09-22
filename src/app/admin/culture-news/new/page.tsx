import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import NewsForm from "../NewsForm";
import { createNews } from "../actions";

export default async function NewNewsPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-news");

  // The form needs the institution up front: uploads go into its folder, and the
  // Storage policy checks that folder before the row even exists.
  // A platform admin belongs to none, so fall back to the site's own institution.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-news");

  return <NewsForm organizationId={organizationId} action={createNews} heading="Новая новость" />;
}
