import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureMemberById } from "@/lib/cultureMembers";
import { listCultureClubs } from "@/lib/cultureClubs";
import MemberForm from "../MemberForm";
import { updateMember } from "../actions";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-members");

  // RLS decides visibility, so an artist belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here, and
  // that is the point.
  const member = await getCultureMemberById(id);
  if (!member) notFound();

  const organizationId = identity.organizationId ?? member.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-members");

  const collectives = (await listCultureClubs("creative_collective")).map((c) => ({
    id: c.id,
    name: c.nameRu ?? c.nameKk ?? "Коллектив",
  }));

  return (
    <MemberForm
      member={member}
      organizationId={organizationId}
      collectives={collectives}
      action={updateMember}
      heading={member.nameRu ?? member.nameKk ?? "Артист"}
    />
  );
}
