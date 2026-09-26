"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SeatMap, { assignCategoryColors, type SeatMapRow, type SeatMapSeat } from "@/components/SeatMap";
import SeatControls from "./SeatControls";
import type { HallSeatRecord } from "@/lib/halls";

/**
 * Click-to-edit seat map for a hall. Category colour comes from
 * assignCategoryColors (ordered by first appearance, not hashed, so it stays
 * stable as categories are added) — "inactive" seats get the same colour,
 * muted, rather than a second independent colour axis. Clicking a seat opens
 * SeatControls for it below the map instead of the old always-visible
 * per-row inputs.
 */
export default function SeatMapEditor({ seats }: { seats: HallSeatRecord[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // A click anywhere outside the map or the panel closes it — otherwise the
  // panel only ever closes by re-clicking the same seat, which isn't how a
  // popover is expected to behave.
  useEffect(() => {
    if (!editingId) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setEditingId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [editingId]);

  const categoryColors = useMemo(() => assignCategoryColors(seats.map((seat) => seat.category)), [seats]);

  const rows: SeatMapRow[] = useMemo(() => {
    const grouped: SeatMapRow[] = [];
    for (const seat of seats) {
      const mapSeat: SeatMapSeat = {
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        category: seat.category,
        status: seat.id === editingId ? "selected" : seat.isActive ? "active" : "inactive",
      };
      const current = grouped[grouped.length - 1];
      if (current && current.label === seat.rowLabel) current.seats.push(mapSeat);
      else grouped.push({ label: seat.rowLabel, seats: [mapSeat] });
    }
    return grouped;
  }, [seats, editingId]);

  const editingSeat = seats.find((seat) => seat.id === editingId) ?? null;

  function seatVariant(mapSeat: SeatMapSeat) {
    if (mapSeat.status === "selected") return { className: "bg-gold text-ocean-dark" };
    const color = categoryColors.get(mapSeat.category) ?? "bg-ocean text-cream";
    return { className: mapSeat.status === "inactive" ? `${color} opacity-30 grayscale` : color };
  }

  return (
    <div ref={containerRef}>
      <SeatMap
        rows={rows}
        seatVariant={seatVariant}
        onSeatClick={(seat) => setEditingId((current) => (current === seat.id ? null : seat.id))}
        seatTooltip={(seat) => `Ряд ${seat.rowLabel}, место ${seat.seatNumber} — ${seat.category}`}
        legend={[
          ...Array.from(categoryColors.entries()).map(([category, className]) => ({
            swatchClassName: className.split(" ")[0],
            label: category,
          })),
          { swatchClassName: "bg-ocean/10", label: "Скрыто (приглушено)" },
        ]}
      />

      {editingSeat && (
        <div className="mt-4 bg-cream/40 border border-cream-dark rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ocean">
            Ряд {editingSeat.rowLabel}, место {editingSeat.seatNumber}
          </p>
          <div className="flex items-center gap-3">
            <SeatControls id={editingSeat.id} category={editingSeat.category} isActive={editingSeat.isActive} />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-ocean/40 hover:text-ocean text-lg leading-none"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
