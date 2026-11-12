"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RowPlacements } from "@/lib/hallRowLayout";
import SeatMap, { assignCategoryColors, seatsToRows, type SeatMapSeat } from "@/components/SeatMap";
import { categoryLabel } from "@/lib/seatCategories";
import { seatName } from "@/lib/hallSections";
import ScannerClient, { type ScanEvent } from "../admin/tickets/scan/ScannerClient";

type DoorSeat = { id: string; section: string; rowLabel: string; seatNumber: number; category: string };

/** Other doors scan too: the map asks the server again this often while the page is in view. */
const REFRESH_MS = 20_000;

const ENTERED = "bg-green-600 text-white";
const BROKEN = "bg-gray-300 text-gray-600 line-through";

/**
 * The scanner and, under it, the hall: seats already inside in green, the rest in the colour of
 * their category (VIP, Стандарт…), seats out of order crossed out. The counter and the map follow
 * every scan at this door and refresh by themselves for the others.
 */
export default function DoorClient({
  events,
  currentId,
  seats,
  entered,
  broken,
  sold,
  rowShape,
  numbering,
  rowLayouts,
}: {
  events: ScanEvent[];
  currentId: string | null;
  seats: DoorSeat[];
  entered: string[];
  broken: string[];
  sold: number;
  rowShape?: "curved" | "straight";
  numbering?: "ltr" | "rtl";
  rowLayouts?: RowPlacements;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const onEventChange = useCallback((id: string) => router.replace(`/door?event=${id}`), [router]);
  const onChecked = useCallback(() => router.refresh(), [router]);

  const inside = useMemo(() => new Set(entered), [entered]);
  const outOfOrder = useMemo(() => new Set(broken), [broken]);
  const colors = useMemo(() => assignCategoryColors(seats.map((seat) => seat.category)), [seats]);
  const rows = useMemo(
    () =>
      seatsToRows(
        seats.map(
          (seat): SeatMapSeat => ({
            id: seat.id,
            section: seat.section,
            rowLabel: seat.rowLabel,
            seatNumber: seat.seatNumber,
            category: seat.category,
            status: inside.has(seat.id) ? "entered" : outOfOrder.has(seat.id) ? "broken" : "seat",
          })
        )
      ),
    [seats, inside, outOfOrder]
  );

  const legend = [
    ...[...colors.keys()].map((category) => ({
      swatchClassName: colors.get(category)!.solid.split(" ")[0],
      label: categoryLabel(category),
    })),
    { swatchClassName: "bg-green-600", label: "Прошёл" },
    ...(broken.length > 0 ? [{ swatchClassName: "bg-gray-300", label: "Неисправно" }] : []),
  ];

  return (
    <div className="space-y-6">
      <ScannerClient events={events} initialEventId={currentId ?? undefined} onEventChange={onEventChange} onChecked={onChecked} />

      {currentId && (
        <section className="bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-ocean">Схема зала</h2>
            <p className="text-sm font-semibold text-ocean">
              Прошли: <span className="text-green-700">{entered.length}</span> из {sold}
            </p>
          </div>
          {seats.length === 0 ? (
            <p className="text-sm text-ocean/60">В зале этого мероприятия нет мест.</p>
          ) : (
            <SeatMap
              rows={rows}
              rowShape={rowShape}
              numbering={numbering}
              rowLayouts={rowLayouts}
              seatVariant={(seat) => ({
                className:
                  seat.status === "entered" ? ENTERED : seat.status === "broken" ? BROKEN : (colors.get(seat.category)?.solid ?? "bg-ocean text-cream"),
              })}
              seatTooltip={(seat) =>
                `${seatName(seat)} — ${categoryLabel(seat.category)}${
                  seat.status === "entered" ? " — прошёл" : seat.status === "broken" ? " — неисправно" : ""
                }`
              }
              legend={legend}
            />
          )}
        </section>
      )}
    </div>
  );
}
