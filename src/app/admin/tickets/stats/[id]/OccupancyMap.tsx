"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RowPlacements } from "@/lib/hallRowLayout";
import SeatMap, { assignCategoryColors, seatsToRows, type SeatMapSeat } from "@/components/SeatMap";
import { categoryLabel } from "@/lib/seatCategories";
import { seatName } from "@/lib/hallSections";
import type { SeatBlock, SeatOccupant } from "@/lib/ticketing/occupancy";

export type OccupancySeat = {
  id: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
};

/** How often the map asks the server again while the page is open and in view. */
const REFRESH_MS = 30_000;

const STATE_STYLE: Record<SeatOccupant["state"], { className: string; label: string }> = {
  sold: { className: "bg-red-500 text-white", label: "Продано" },
  entered: { className: "bg-gray-500 text-white", label: "Продано, зритель вошёл" },
  held: { className: "bg-orange-200 text-orange-900 ring-1 ring-inset ring-orange-400", label: "Ожидает оплаты" },
};
const OFF_SALE = "bg-ocean/10 text-ocean/30";
const BLOCK_STYLE: Record<SeatBlock["kind"], { className: string; label: string }> = {
  reserved: { className: "bg-purple-500 text-white", label: "Бронь" },
  broken: { className: "bg-gray-300 text-gray-600 line-through", label: "Неисправно" },
};

function money(amount: number): string {
  return amount === 0 ? "бесплатно" : `${new Intl.NumberFormat("ru-RU").format(amount)} ₸`;
}

/**
 * The event's hall as staff see it: free seats in their category's colour (Стандарт, VIP…),
 * taken ones red (sold), grey (sold and already inside) or orange (held, not paid yet). A tap on
 * a seat says what is on it. Re-reads the server every 30 seconds, so new sales appear without
 * reloading the page.
 */
export default function OccupancyMap({
  seats,
  occupants,
  prices,
  ordersHref,
  rowShape,
  rowLayouts,
  blocks = {},
}: {
  /** Seats closed from sale for this event (kept for a guest, or out of order). */
  blocks?: Record<string, SeatBlock>;
  /** The hall's row shape, so the map is drawn as the hall is set up. */
  rowShape?: "curved" | "straight";
  /** Rows set up on their own: where each one stands within its section. */
  rowLayouts?: RowPlacements;
  seats: OccupancySeat[];
  occupants: Record<string, SeatOccupant>;
  /** category -> price for this event; a category missing here is not on sale. */
  prices: Record<string, number>;
  ordersHref: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

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
            status: occupants[seat.id]?.state ?? blocks[seat.id]?.kind ?? (seat.category in prices ? "free" : "off"),
          })
        )
      ),
    [seats, occupants, blocks, prices]
  );

  function seatVariant(seat: SeatMapSeat) {
    const ring = seat.id === selectedId ? " ring-2 ring-offset-2 ring-ocean-dark" : "";
    if (seat.status === "free") return { className: (colors.get(seat.category)?.solid ?? "bg-ocean text-cream") + ring };
    if (seat.status === "off") return { className: OFF_SALE + ring };
    if (seat.status === "reserved" || seat.status === "broken") return { className: BLOCK_STYLE[seat.status].className + ring };
    return { className: STATE_STYLE[seat.status as SeatOccupant["state"]].className + ring };
  }

  function tooltip(seat: SeatMapSeat): string {
    const occupant = occupants[seat.id];
    const block = blocks[seat.id];
    const state = occupant ? STATE_STYLE[occupant.state].label : block ? BLOCK_STYLE[block.kind].label : seat.status === "free" ? "Свободно" : "Не продаётся";
    return `${seatName(seat)} — ${categoryLabel(seat.category)} — ${state}`;
  }

  const legend = [
    ...[...colors.keys()]
      .filter((category) => category in prices)
      .map((category) => ({
        swatchClassName: colors.get(category)!.solid.split(" ")[0],
        label: `${categoryLabel(category)}, свободно`,
      })),
    { swatchClassName: "bg-red-500", label: STATE_STYLE.sold.label },
    { swatchClassName: "bg-gray-500", label: "Вошёл" },
    { swatchClassName: "bg-orange-200", label: STATE_STYLE.held.label },
    ...(Object.values(blocks).some((b) => b.kind === "reserved") ? [{ swatchClassName: "bg-purple-500", label: "Бронь" }] : []),
    ...(Object.values(blocks).some((b) => b.kind === "broken") ? [{ swatchClassName: "bg-gray-300", label: "Неисправно" }] : []),
    ...(seats.some((seat) => !(seat.category in prices)) ? [{ swatchClassName: "bg-ocean/10", label: "Не продаётся" }] : []),
  ];

  const selected = seats.find((seat) => seat.id === selectedId) ?? null;
  const occupant = selected ? occupants[selected.id] : undefined;
  const price = selected ? prices[selected.category] : undefined;

  return (
    <div>
      <SeatMap
        rows={rows}
        rowShape={rowShape}
        rowLayouts={rowLayouts}
        seatVariant={seatVariant}
        onSeatClick={(seat) => setSelectedId((current) => (current === seat.id ? null : seat.id))}
        seatTooltip={tooltip}
        legend={legend}
      />

      {selected && (
        <div className="mt-4 bg-cream/40 border border-cream-dark rounded-2xl p-4" role="status">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ocean">{seatName(selected)}</p>
              <p className="text-sm text-ocean/60">
                {categoryLabel(selected.category)} · {price === undefined ? "не продаётся" : money(price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-ocean/40 hover:text-ocean text-lg leading-none"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-ocean mt-2">
            {occupant ? STATE_STYLE[occupant.state].label : blocks[selected.id] ? BLOCK_STYLE[blocks[selected.id].kind].label + (blocks[selected.id].note ? ` · ${blocks[selected.id].note}` : "") : price === undefined ? "Не продаётся" : "Свободно"}
            {occupant?.orderNumber && (
              <>
                {" · "}
                <a href={ordersHref} className="font-semibold hover:text-gold-dark underline-offset-2 hover:underline">
                  заказ {occupant.orderNumber}
                </a>
              </>
            )}
            {occupant?.buyerName && <span className="text-ocean/60"> · {occupant.buyerName}</span>}
            {occupant && occupant.paid !== null && <span className="text-ocean/60"> · куплено за {money(occupant.paid)}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
