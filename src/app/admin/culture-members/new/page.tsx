import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listCultureClubs } from "@/lib/cultureClubs";
import MemberForm from "../MemberForm";
import { createMember } from "../actions";

export default async function NewMemberPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-members");

  // The form needs the institution up front: the portrait upload goes into its
  // folder, and the Storage policy checks that folder before the row even exists.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-members");

  // Listed here, not inside the form: the form is a client component and cannot
  // reach the database itself.
  const collectives = (await listCultureClubs("creative_collective")).map((c) => ({
    id: c.id,
    name: c.nameRu ?? c.nameKk ?? "Коллектив",
  }));

  return (
    <MemberForm
      organizationId={organizationId}
      collectives={collectives}
      action={createMember}
      heading="Новый артист"
    />
  );
}
