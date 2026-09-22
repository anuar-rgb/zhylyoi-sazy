import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureEventById } from "@/lib/cultureEvents";
import EventForm from "../EventForm";
import { updateEvent } from "../actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-events");

  // RLS decides visibility, so an event belonging to another institution simply
  // is not found rather than being refused — the two are indistinguishable here,
  // and that is the point.
  const event = await getCultureEventById(id);
  if (!event) notFound();

  const organizationId = identity.organizationId ?? event.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/culture-events");

  return (
    <EventForm
      event={event}
      organizationId={organizationId}
      action={updateEvent}
      heading={event.titleRu ?? event.titleKk ?? "Мероприятие"}
     
    />
  );
}
