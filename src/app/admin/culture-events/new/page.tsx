import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listHalls } from "@/lib/halls";
import EventForm from "../EventForm";
import { createEvent } from "../actions";

export default async function NewEventPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-events");

  // The form needs the institution up front: uploads go into its folder, and the
  // Storage policy checks that folder before the event row even exists.
  // A platform admin belongs to none, so fall back to the site's own institution.
  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-events");

  const halls = (await listHalls())
    .filter((hall) => hall.isActive)
    .map((hall) => ({ id: hall.id, name: hall.nameRu ?? hall.nameKk ?? "Без названия" }));

  return <EventForm organizationId={organizationId} halls={halls} action={createEvent} heading="Новое мероприятие" />;
}
