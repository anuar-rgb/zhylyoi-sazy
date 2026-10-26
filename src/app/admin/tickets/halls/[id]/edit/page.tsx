import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getHallById, listHallCategories, listHallRowLayouts, listHallSeats, rowLayoutsForMap } from "@/lib/halls";
import { rowLayoutKey } from "@/lib/hallRowLayout";
import type { HallSection } from "@/lib/hallSections";
import HallForm from "../../HallForm";
import RowLayoutForm, { type RowLayoutRow } from "../../RowLayoutForm";
import GenerateGridForm from "../../GenerateGridForm";
import SeatMapEditor from "../../SeatMapEditor";
import HallCategoriesForm from "../../HallCategoriesForm";
import { updateHall } from "../../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * Everything about a hall in one place: its name, its seat categories and which seats are VIP
 * (or another category), and the grid's size. No prices: each event sets its own. A new hall lands here right after
 * it is created.
 */
export default async function EditHallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/halls");

  // RLS decides visibility, so a hall belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const hall = await getHallById(id);
  if (!hall) notFound();

  // Стандарт and VIP always, then every custom one the hall has: on a seat, or added by name and
  // not yet given to any seat. The seat picker offers the same list.
  const [seats, categories, rowLayouts] = await Promise.all([listHallSeats(id), listHallCategories(id), listHallRowLayouts(id)]);

  const activeSeats = seats.filter((seat) => seat.isActive);

  // Each section's current shape, for the grid form: how many rows, and the widest row.
  const shapes: Partial<Record<HallSection, { rows: Set<string>; seats: number }>> = {};
  for (const seat of activeSeats) {
    const shape = (shapes[seat.section] ??= { rows: new Set(), seats: 0 });
    shape.rows.add(seat.rowLabel);
    shape.seats = Math.max(shape.seats, seat.seatNumber);
  }
  const sizes = Object.fromEntries(
    Object.entries(shapes).map(([section, shape]) => [section, { rows: shape!.rows.size, seats: shape!.seats }])
  ) as Partial<Record<HallSection, { rows: number; seats: number }>>;
  // Every row with seats, for «Настроить ряд»: its own setting, or else where its seats end.
  const layoutByRow = new Map(rowLayouts.map((layout) => [rowLayoutKey(layout.section, layout.rowLabel), layout]));
  const layoutRows: RowLayoutRow[] = [];
  for (const seat of activeSeats) {
    const key = rowLayoutKey(seat.section, seat.rowLabel);
    const last = layoutRows[layoutRows.length - 1];
    if (last && rowLayoutKey(last.section, last.label) === key) {
      if (!layoutByRow.get(key)?.seatCount) last.seatCount = Math.max(last.seatCount, seat.seatNumber);
      continue;
    }
    const layout = layoutByRow.get(key);
    layoutRows.push({
      section: seat.section,
      label: seat.rowLabel,
      seatCount: layout?.seatCount ?? seat.seatNumber,
      alignment: layout?.alignment ?? "center",
      offsetStart: layout?.offsetStart ?? 0,
      custom: !!layout,
    });
  }
  // A full row of each section: the widest row that has no setting of its own, so a row made
  // longer or shorter does not change what «Сбросить» brings the others back to.
  const fullWidths: Partial<Record<HallSection, number>> = {};
  for (const row of layoutRows) {
    if (!row.custom) fullWidths[row.section] = Math.max(fullWidths[row.section] ?? 0, row.seatCount);
  }
  for (const [section, size] of Object.entries(sizes) as [HallSection, { rows: number; seats: number }][]) {
    fullWidths[section] ??= size.seats;
  }

  const seatCounts: Record<string, number> = {};
  for (const seat of activeSeats) seatCounts[seat.category] = (seatCounts[seat.category] ?? 0) + 1;

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

      <HallForm hall={hall} action={updateHall} heading={hall.nameRu ?? hall.nameKk ?? "Зал"} cancelHref="/admin/tickets/halls" />

      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">
          Места и категории <span className="text-ocean/40 font-normal text-base">({hall.totalCapacity})</span>
        </h2>
        <p className="text-sm text-ocean/60 mb-4">
          Нажмите на места (или на номер ряда, чтобы выбрать весь ряд) и назначьте категорию: Стандарт, VIP или свою.
        </p>
        {seats.length === 0 ? (
          <div className={CARD}>
            <p className="text-sm text-ocean/60">В зале ещё нет мест — задайте сетку ниже.</p>
          </div>
        ) : (
          <div className={CARD}>
            <SeatMapEditor seats={seats} categories={categories} rowShape={hall.rowShape} rowLayouts={rowLayoutsForMap(rowLayouts)} />
          </div>
        )}
      </section>

      {seats.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">Категории мест</h2>
          <p className="text-sm text-ocean/60 mb-4">
            Какие категории есть в этом зале. Цену каждой категории задают у мероприятия, так один зал подходит для
            разных концертов с разными ценами. Свои категории можно переименовать или удалить — их места станут
            «Стандарт».
          </p>
          <div className={CARD}>
            <HallCategoriesForm hallId={hall.id} categories={categories} seatCounts={seatCounts} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">Сетка мест и сектора</h2>
        <p className="text-sm text-ocean/60 mb-4">
          Размер партера, боковых секторов и балкона. Здесь же можно добавить сектор, которого ещё нет.
        </p>
        <div className={CARD}>
          <GenerateGridForm hallId={hall.id} sizes={sizes} rowShape={hall.rowShape} />
        </div>
      </section>

      {layoutRows.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">Отдельные ряды</h2>
          <p className="text-sm text-ocean/60 mb-4">
            Для неполных рядов и смещения мест: сколько мест в ряду и где он стоит — по центру, слева, справа или со
            сдвигом.
          </p>
          <div className={CARD}>
            <RowLayoutForm hallId={hall.id} rows={layoutRows} fullWidths={fullWidths} />
          </div>
        </section>
      )}
    </div>
  );
}
