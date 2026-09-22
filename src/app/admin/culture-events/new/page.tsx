import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { canPublish } from "@/lib/roles";
import { getSiteOrganizationId } from "@/lib/organization";
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

  return <EventForm organizationId={organizationId} action={createEvent} heading="Новое мероприятие" canPublish={canPublish(identity.role)} />;
}
