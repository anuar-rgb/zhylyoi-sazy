import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import CollectiveForm from "../CollectiveForm";
import { createCollective } from "../actions";

export default async function NewCollectivePage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-collectives");

  // The form needs the institution up front: uploads go into its folder, and the
  // Storage policy checks that folder before the row even exists.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-collectives");

  return (
    <CollectiveForm organizationId={organizationId} action={createCollective} heading="Новый коллектив" />
  );
}
