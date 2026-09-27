import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listHalls } from "@/lib/halls";
import EventForm from "../EventForm";
import { createEvent } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ hallId?: string }>;
}) {
  const { hallId } = await searchParams;

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

  // Only a hall this person can actually see is honoured. The id comes from the
  // address bar, and preselecting one that is not in the list would show a
  // picker whose value is not among its options.
  const defaultHallId = hallId && halls.some((hall) => hall.id === hallId) ? hallId : undefined;

  return (
    <EventForm
      organizationId={organizationId}
      halls={halls}
      defaultHallId={defaultHallId}
      action={createEvent}
      heading="Новое мероприятие"
    />
  );
}
