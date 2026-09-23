import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById } from "@/lib/cultureClubs";
import { listCultureMembers } from "@/lib/cultureMembers";
import CollectiveForm from "../CollectiveForm";
import RosterCards from "../RosterCards";
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

  // Sorted by the roster's own order, which listCultureMembers already applies.
  const members = (await listCultureMembers()).filter((member) => member.clubId === collective.id);

  return (
    <div>
      <CollectiveForm
        collective={collective}
        organizationId={organizationId}
        memberCount={members.length}
        action={updateCollective}
        heading={collective.nameRu ?? collective.nameKk ?? "Коллектив"}
      />

      {/* Outside the form on purpose: these cards are links and their own delete
          buttons, and nesting them in the form would make the browser submit the
          collective whenever somebody pressed one. */}
      <RosterCards collectiveId={collective.id} members={members} />
    </div>
  );
}
