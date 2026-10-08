import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { getCultureEventById } from "@/lib/cultureEvents";
import { listHalls } from "@/lib/halls";
import { listPublicPaymentMethods } from "@/lib/paymentMethods";
import { countActiveBookingsForEvent } from "@/lib/bookingsAdmin";
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

  // Only an event that sells tickets (has a hall) shows the hall and payment method; an Афиша
  // event's form is informational, and saving it leaves those two untouched.
  const ticketing = Boolean(event.hallId);

  const [halls, paymentMethods, bookingCount] = await Promise.all([
    ticketing
      ? listHalls().then((rows) =>
          rows.filter((hall) => hall.isActive).map((hall) => ({ id: hall.id, name: hall.nameRu ?? hall.nameKk ?? "Без названия" }))
        )
      : Promise.resolve([]),
    ticketing ? listPublicPaymentMethods(organizationId) : Promise.resolve([]),
    countActiveBookingsForEvent(id),
  ]);

  return (
    <EventForm
      event={event}
      organizationId={organizationId}
      ticketing={ticketing}
      halls={halls}
      paymentMethods={paymentMethods}
      bookingCount={bookingCount}
      action={updateEvent}
      heading={event.titleRu ?? event.titleKk ?? "Мероприятие"}
    />
  );
}
