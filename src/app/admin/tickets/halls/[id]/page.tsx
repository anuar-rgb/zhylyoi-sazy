import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getHallById, listHallSeats } from "@/lib/halls";
import HallForm from "../HallForm";
import GenerateGridForm from "../GenerateGridForm";
import SeatMapEditor from "../SeatMapEditor";
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
          <div className={CARD}>
            <SeatMapEditor seats={seats} />
          </div>
        )}
      </section>
    </div>
  );
}
