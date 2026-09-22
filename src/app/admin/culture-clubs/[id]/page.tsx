import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureClubById } from "@/lib/cultureClubs";
import ClubForm from "../ClubForm";
import { updateClub } from "../actions";

export default async function EditClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-clubs");

  // RLS decides visibility, so a club belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const club = await getCultureClubById(id);
  if (!club) notFound();

  const organizationId = identity.organizationId ?? club.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-clubs");

  return (
    <ClubForm
      club={club}
      organizationId={organizationId}
      action={updateClub}
      heading={club.nameRu ?? club.nameKk ?? "Кружок"}
    />
  );
}
