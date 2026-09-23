import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById } from "@/lib/cultureClubs";
import { listCultureMembers } from "@/lib/cultureMembers";
import { listCultureRepertoire } from "@/lib/cultureRepertoire";
import { listCultureVideos } from "@/lib/cultureVideos";
import CollectiveForm from "../CollectiveForm";
import RosterCards from "../RosterCards";
import RepertoireCards from "../RepertoireCards";
import VideoCards from "../VideoCards";
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

  // Sorted by each list's own order, which the reader already applies.
  const [allMembers, allRepertoire, allVideos] = await Promise.all([
    listCultureMembers(),
    listCultureRepertoire(),
    listCultureVideos(),
  ]);
  const members = allMembers.filter((member) => member.clubId === collective.id);
  const repertoire = allRepertoire.filter((piece) => piece.clubId === collective.id);
  const videos = allVideos.filter((video) => video.clubId === collective.id);

  return (
    <div>
      <CollectiveForm
        collective={collective}
        organizationId={organizationId}
        memberCount={members.length}
        action={updateCollective}
        heading={collective.nameRu ?? collective.nameKk ?? "Коллектив"}
      />

      {/* Outside the form on purpose: these are links and their own delete
          buttons, and nesting them in the form would make the browser submit the
          collective whenever somebody pressed one. */}
      <RosterCards collectiveId={collective.id} members={members} />
      <RepertoireCards collectiveId={collective.id} pieces={repertoire} />
      <VideoCards collectiveId={collective.id} videos={videos} />
    </div>
  );
}
