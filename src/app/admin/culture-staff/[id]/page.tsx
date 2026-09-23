import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureStaffById } from "@/lib/cultureStaff";
import StaffForm from "../StaffForm";
import { updateStaff } from "../actions";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-staff");

  // RLS decides visibility, so a person belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here, and
  // that is the point.
  const person = await getCultureStaffById(id);
  if (!person) notFound();

  const organizationId = identity.organizationId ?? person.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-staff");

  return (
    <StaffForm
      person={person}
      organizationId={organizationId}
      action={updateStaff}
      heading={person.nameRu ?? person.nameKk ?? "Сотрудник"}
    />
  );
}
