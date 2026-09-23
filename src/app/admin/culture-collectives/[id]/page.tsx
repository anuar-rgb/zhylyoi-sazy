import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById } from "@/lib/cultureClubs";
import { listCultureMembers } from "@/lib/cultureMembers";
import CollectiveForm from "../CollectiveForm";
import { updateCollective } from "../actions";

export default async function EditCollectivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-collectives");

  // RLS decides visibility, so a collective belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const collective = await getCultureClubById(id);
  if (!collective) notFound();

  const organizationId = identity.organizationId ?? collective.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-collectives");

  const members = await listCultureMembers();
  const memberCount = members.filter((member) => member.clubId === collective.id).length;

  return (
    <CollectiveForm
      collective={collective}
      organizationId={organizationId}
      memberCount={memberCount}
      action={updateCollective}
      heading={collective.nameRu ?? collective.nameKk ?? "Коллектив"}
    />
  );
}
