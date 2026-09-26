import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getHallById, listHallSeats } from "@/lib/halls";
import HallForm from "../HallForm";
import GenerateGridForm from "../GenerateGridForm";
import SeatControls from "../SeatControls";
import { updateHall } from "../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function EditHallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/halls");

  // RLS decides visibility, so a hall belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const hall = await getHallById(id);
  if (!hall) notFound();

  const seats = await listHallSeats(id);

  // Grouped for display only — the list itself already comes ordered by row then
  // seat number, so building the groups is just a fold, not a resort.
  const rows: { label: string; seats: typeof seats }[] = [];
  for (const seat of seats) {
    const current = rows[rows.length - 1];
    if (current && current.label === seat.rowLabel) current.seats.push(seat);
    else rows.push({ label: seat.rowLabel, seats: [seat] });
  }

  return (
    <div>
      <Link
        href="/admin/tickets/halls"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Залы
      </Link>

      <HallForm hall={hall} action={updateHall} heading={hall.nameRu ?? hall.nameKk ?? "Зал"} />

      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">
          Места <span className="text-ocean/40 font-normal text-base">({hall.totalCapacity})</span>
        </h2>

        {seats.length === 0 ? (
          <div className={CARD}>
            <p className="text-sm text-ocean/60 mb-4">
              В зале ещё нет мест. Задайте сетку один раз — дальше отдельные места можно будет менять и скрывать по
              одному.
            </p>
            <GenerateGridForm hallId={hall.id} />
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className={CARD}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="shrink-0 text-sm font-bold text-ocean bg-cream/60 rounded-full px-3 py-1">
                    Ряд {row.label}
                  </span>
                  <span className="text-xs text-ocean/40">{row.seats.length} мест</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.seats.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex items-center gap-2 bg-cream/30 border border-cream-dark rounded-2xl px-2.5 py-1.5"
                    >
                      <span className="text-xs font-semibold text-ocean/70 w-6 text-center shrink-0">
                        {seat.seatNumber}
                      </span>
                      <SeatControls id={seat.id} category={seat.category} isActive={seat.isActive} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
