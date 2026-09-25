import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getCultureEventById } from "@/lib/cultureEvents";
import { listHallSeatCategories } from "@/lib/halls";
import { listEventTicketTypes } from "@/lib/eventTicketTypes";
import TicketTypeForm from "./TicketTypeForm";
import ToggleTicketTypeButton from "./ToggleTicketTypeButton";
import { createTicketType, updateTicketType } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function EventTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/culture-events");

  // RLS decides visibility, so an event belonging to another institution simply
  // is not found rather than being refused.
  const event = await getCultureEventById(id);
  if (!event) notFound();

  const [hallCategories, ticketTypes] = await Promise.all([
    event.hallId ? listHallSeatCategories(event.hallId) : Promise.resolve<string[]>([]),
    listEventTicketTypes(id),
  ]);

  // Only categories that don't already have a price — the unique (event_id,
  // category) index would just reject a second one for the same category, and
  // there is no reason to offer a choice that can only fail.
  const pricedCategories = new Set(ticketTypes.map((t) => t.category));
  const availableCategories = hallCategories.filter((category) => !pricedCategories.has(category));

  const eventTitle = event.titleRu ?? event.titleKk ?? "Мероприятие";

  return (
    <div>
      <Link
        href="/admin/culture-events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Афиша
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-1">Билеты: {eventTitle}</h1>

      {!event.hallId ? (
        <p className="text-sm text-ocean/60 mb-6">
          У мероприятия не выбран зал — привяжите зал в карточке мероприятия, чтобы категории мест подставлялись
          сюда сами. Пока можно задать категорию вручную ниже.
        </p>
      ) : (
        <p className="text-sm text-ocean/60 mb-6">Категории ниже — те, что реально есть в зале мероприятия.</p>
      )}

      {ticketTypes.length > 0 && (
        <div className="space-y-3 mb-8">
          {ticketTypes.map((ticketType) => {
            const name = ticketType.nameRu ?? ticketType.nameKk ?? ticketType.category;

            return (
              <details key={ticketType.id} className={`${CARD} overflow-hidden`}>
                <summary className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none list-none">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-ocean/40 bg-cream/60 rounded-full px-2.5 py-1 mr-2">
                      {ticketType.category}
                    </span>
                    <span className="font-bold text-ocean">{name}</span>
                    <span className="text-ocean/60 ml-2">
                      {ticketType.isFree ? "Бесплатно" : `${ticketType.price} ${ticketType.currency}`}
                    </span>
                  </div>
                  <ToggleTicketTypeButton id={ticketType.id} eventId={id} isActive={ticketType.isActive} />
                </summary>

                <div className="mt-4 pt-4 border-t border-cream-dark">
                  <TicketTypeForm
                    eventId={id}
                    ticketType={ticketType}
                    categories={hallCategories}
                    action={updateTicketType}
                    submitLabel="Сохранить"
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}

      {(availableCategories.length > 0 || !event.hallId) && (
        <div className={CARD}>
          <p className="text-sm font-semibold text-ocean mb-4">Добавить тип билета</p>
          <TicketTypeForm
            eventId={id}
            categories={availableCategories}
            action={createTicketType}
            submitLabel="Добавить"
          />
        </div>
      )}

      {event.hallId && hallCategories.length === 0 && (
        <div className={`${CARD} text-center`}>
          <p className="text-ocean/60 text-sm">
            В привязанном зале ещё нет мест — создайте сетку мест в разделе «Залы», тогда здесь появятся категории
            для цены.
          </p>
        </div>
      )}

      {event.hallId && hallCategories.length > 0 && availableCategories.length === 0 && (
        <p className="text-xs text-ocean/40 mt-3 text-center">Цена задана для всех категорий этого зала.</p>
      )}
    </div>
  );
}
