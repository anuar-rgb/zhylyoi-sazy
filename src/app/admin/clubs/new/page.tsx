import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import ClubForm from "../ClubForm";
import { createClub } from "../actions";

export default async function NewClubPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/clubs");

  // The form needs the institution up front: uploads go into its folder, and the
  // Storage policy checks that folder before the club row even exists.
  // A platform admin belongs to none, so fall back to the site's own institution.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/clubs");

  return <ClubForm organizationId={organizationId} action={createClub} heading="Новый кружок" />;
}
