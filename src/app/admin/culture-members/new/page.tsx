import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listCultureClubs } from "@/lib/cultureClubs";
import MemberForm from "../MemberForm";
import { createMember } from "../actions";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const { club } = await searchParams;

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

  // Only a collective this person can actually see is honoured. The id comes from
  // the address bar, and preselecting one that is not in the list would show a
  // picker whose value is not among its options.
  const known = club && collectives.some((c) => c.id === club) ? club : undefined;

  return (
    <MemberForm
      organizationId={organizationId}
      collectives={collectives}
      defaultClubId={known}
      returnTo={known ? `/admin/culture-collectives/${known}` : undefined}
      action={createMember}
      heading="Новый артист"
    />
  );
}
