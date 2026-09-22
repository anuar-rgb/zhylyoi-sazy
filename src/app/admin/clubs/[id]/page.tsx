import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getClubById } from "@/lib/clubs";
import ClubForm from "../ClubForm";
import { updateClub } from "../actions";

export default async function EditClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/clubs");

  // RLS decides visibility, so a club belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const club = await getClubById(id);
  if (!club) notFound();

  const organizationId = identity.organizationId ?? club.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/clubs");

  return (
    <ClubForm
      club={club}
      organizationId={organizationId}
      action={updateClub}
      heading={club.nameRu ?? club.nameKk ?? "Кружок"}
    />
  );
}
