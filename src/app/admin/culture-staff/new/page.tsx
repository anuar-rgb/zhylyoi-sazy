import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import StaffForm from "../StaffForm";
import { createStaff } from "../actions";

export default async function NewStaffPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-staff");

  // The form needs the institution up front: the photo upload goes into its folder,
  // and the Storage policy checks that folder before the row even exists.
  // A platform admin belongs to none, so fall back to the site's own institution.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-staff");

  return <StaffForm organizationId={organizationId} action={createStaff} heading="Новый сотрудник" />;
}
