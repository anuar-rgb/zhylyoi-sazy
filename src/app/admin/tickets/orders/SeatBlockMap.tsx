"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import type { RowPlacements } from "@/lib/hallRowLayout";
import SeatMap, { assignCategoryColors, seatsToRows, type SeatMapSeat } from "@/components/SeatMap";
import { categoryLabel } from "@/lib/seatCategories";
import { seatName } from "@/lib/hallSections";
import type { SeatBlock, SeatOccupant } from "@/lib/ticketing/occupancy";
import { blockSeats, unblockSeats } from "./actions";

export type BlockMapSeat = { id: string; section: string; rowLabel: string; seatNumber: number; category: string };

const REFRESH_MS = 30_000;

const STYLE: Record<string, { className: string; label: string }> = {
  sold: { className: "bg-red-500 text-white", label: "Продано" },
  entered: { className: "bg-gray-500 text-white", label: "Продано, зритель вошёл" },
  held: { className: "bg-orange-200 text-orange-900 ring-1 ring-inset ring-orange-400", label: "Ожидает оплаты" },
  reserved: { className: "bg-purple-500 text-white", label: "Бронь" },
  broken: { className: "bg-gray-300 text-gray-600 line-through", label: "Неисправно" },
  off: { className: "bg-ocean/10 text-ocean/30", label: "Не продаётся" },
};

/**
 * The event's hall in «Заказы»: what is sold, held, free — and which seats are closed from sale
 * for this event. Free and closed seats can be picked (several at once) and closed as «Бронь» or
 * «Неисправно», or opened again; a sold or held seat only says whose it is.
 */
export default function SeatBlockMap({
  eventId,
  seats,
  occupants,
  blocks,
  prices,
  locked,
  rowShape,
  rowLayouts,
}: {
  eventId: string;
  seats: BlockMapSeat[];
  occupants: Record<string, SeatOccupant>;
  blocks: Record<string, SeatBlock>;
  /** category -> price for this event; a category missing here is not on sale. */
  prices: Record<string, number>;
  /** Past or archived event: the map only shows. */
  locked: boolean;
  rowShape?: "curved" | "straight";
  rowLayouts?: RowPlacements;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [info, setInfo] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && selected.size === 0) router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router, selected.size]);

  const colors = useMemo(() => assignCategoryColors(seats.map((seat) => seat.category)), [seats]);
  const stateOf = (seat: BlockMapSeat): string =>
    occupants[seat.id]?.state ?? blocks[seat.id]?.kind ?? (seat.category in prices ? "free" : "off");

  const rows = useMemo(
    () =>
      seatsToRows(
        seats.map((seat): SeatMapSeat => ({ id: seat.id, section: seat.section, rowLabel: seat.rowLabel, seatNumber: seat.seatNumber, category: seat.category, status: stateOf(seat) }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seats, occupants, blocks, prices]
  );

  function seatVariant(seat: SeatMapSeat) {
    const ring = selected.has(seat.id) || seat.id === info ? " ring-2 ring-offset-2 ring-ocean-dark" : "";
    const base = seat.status === "free" ? (colors.get(seat.category)?.solid ?? "bg-ocean text-cream") : STYLE[seat.status].className;
    return { className: base + ring };
  }

  function onSeat(seat: SeatMapSeat) {
    // Sold or held: nothing to close, just say whose it is.
    if (seat.status === "sold" || seat.status === "entered" || seat.status === "held" || locked) {
      setInfo((current) => (current === seat.id ? null : seat.id));
      return;
    }
    setInfo(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  const chosen = seats.filter((seat) => selected.has(seat.id));
  const freeChosen = chosen.filter((seat) => !blocks[seat.id]).map((seat) => seat.id);
  const blockedChosen = chosen.filter((seat) => blocks[seat.id]).map((seat) => seat.id);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        feedback.success(result.message);
        setSelected(new Set());
        setNote("");
        router.refresh();
      } else feedback.error(result.message);
    });
  }

  const legend = [
    ...[...colors.keys()]
      .filter((category) => category in prices)
      .map((category) => ({ swatchClassName: colors.get(category)!.solid.split(" ")[0], label: `${categoryLabel(category)}, свободно` })),
    { swatchClassName: "bg-red-500", label: "Продано" },
    { swatchClassName: "bg-orange-200", label: "Ожидает оплаты" },
    { swatchClassName: "bg-purple-500", label: "Бронь" },
    { swatchClassName: "bg-gray-300", label: "Неисправно" },
  ];

  const infoSeat = seats.find((seat) => seat.id === info) ?? null;
  const occupant = infoSeat ? occupants[infoSeat.id] : undefined;
  const block = infoSeat ? blocks[infoSeat.id] : undefined;

  return (
    <div>
      <SeatMap
        rows={rows}
        rowShape={rowShape}
        rowLayouts={rowLayouts}
        seatVariant={seatVariant}
        onSeatClick={onSeat}
        seatTooltip={(seat) => {
          const b = blocks[seat.id];
          const label = seat.status === "free" ? "Свободно" : STYLE[seat.status]?.label ?? seat.status;
          return `${seatName(seat)} — ${label}${b?.note ? ` (${b.note})` : ""}`;
        }}
        legend={legend}
      />

      {infoSeat && (
        <div className="mt-4 bg-cream/40 border border-cream-dark rounded-2xl p-4 text-sm text-ocean" role="status">
          <p className="font-semibold">{seatName(infoSeat)}</p>
          <p className="mt-1">
            {occupant ? STYLE[occupant.state].label : block ? STYLE[block.kind].label : "Свободно"}
            {occupant?.orderNumber && <> · заказ {occupant.orderNumber}</>}
            {occupant?.buyerName && <span className="text-ocean/60"> · {occupant.buyerName}</span>}
            {block?.note && <span className="text-ocean/60"> · {block.note}</span>}
          </p>
        </div>
      )}

      {!locked && chosen.length === 0 && !infoSeat && (
        <p className="mt-4 text-xs text-ocean/50">
          Нажмите на свободные места, чтобы закрыть их от продажи («Бронь» для гостя или «Неисправно»), или на закрытые — чтобы
          открыть снова. Проданные места закрыть нельзя.
        </p>
      )}

      {!locked && chosen.length > 0 && (
        <div className="mt-4 bg-cream/40 border border-cream-dark rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-ocean">
              Выбрано мест: {chosen.length}
              <span className="block text-xs font-normal text-ocean/60 mt-0.5">{chosen.map((seat) => seatName(seat)).join("; ")}</span>
            </p>
            <button type="button" onClick={() => setSelected(new Set())} className="text-ocean/40 hover:text-ocean text-lg leading-none" aria-label="Снять выбор">
              ×
            </button>
          </div>
          {freeChosen.length > 0 && (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Заметка (необязательно): например, «для акима»"
                className="w-full px-4 py-2 border border-cream-dark rounded-2xl bg-white text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => blockSeats(eventId, freeChosen, "reserved", note))}
                  className="px-4 py-2 rounded-full bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  Бронь ({freeChosen.length})
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => blockSeats(eventId, freeChosen, "broken", note))}
                  className="px-4 py-2 rounded-full bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600 disabled:opacity-50"
                >
                  Неисправно ({freeChosen.length})
                </button>
              </div>
            </>
          )}
          {blockedChosen.length > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unblockSeats(eventId, blockedChosen))}
              className="px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream disabled:opacity-50"
            >
              Открыть для продажи ({blockedChosen.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
