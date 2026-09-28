import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getHallById } from "@/lib/halls";
import HallForm from "../../HallForm";
import GenerateGridForm from "../../GenerateGridForm";
import { updateHall } from "../../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default async function EditHallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/halls");

  const hall = await getHallById(id);
  if (!hall) notFound();

  return (
    <div>
      <Link
        href={`/admin/tickets/halls/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/50 hover:text-ocean mb-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        {hall.nameRu ?? hall.nameKk ?? "Зал"}
      </Link>

      <HallForm
        hall={hall}
        action={updateHall}
        heading="Изменить зал"
        cancelHref={`/admin/tickets/halls/${hall.id}`}
      />

      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">Сетка мест</h2>
        <div className={CARD}>
          <GenerateGridForm hallId={hall.id} />
        </div>
      </section>
    </div>
  );
}
