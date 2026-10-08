"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SeatMap, { assignCategoryColors, type SeatMapRow, type SeatMapSeat } from "@/components/SeatMap";
import SeatBulkPanel from "./SeatBulkPanel";
import type { HallSeatRecord } from "@/lib/halls";
import { categoryLabel } from "@/lib/seatCategories";

/**
 * Click-to-edit seat map for a hall. Category colour comes from
 * assignCategoryColors — vip/standard are pinned colours, not assigned by
 * order of appearance, so they never shift between saves — "inactive" seats
 * get the same colour, muted, rather than a second independent colour axis.
 *
 * Selection is a set, not a single id: clicking a seat toggles its membership,
 * clicking a row's label toggles the whole row at once (selects it if any seat
 * in it isn't selected yet, clears it if the whole row already is) — the
 * common case of "make the front two rows VIP" is a couple of row-label clicks
 * instead of one dropdown per seat.
 */
export default function SeatMapEditor({ seats }: { seats: HallSeatRecord[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // A click anywhere outside the map or the panel clears the selection —
  // otherwise it only ever clears by re-clicking every selected seat.
  useEffect(() => {
    if (selectedIds.size === 0) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedIds(new Set());
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedIds.size]);

  const categoryColors = useMemo(() => assignCategoryColors(seats.map((seat) => seat.category)), [seats]);

  const rows: SeatMapRow[] = useMemo(() => {
    const grouped: SeatMapRow[] = [];
    for (const seat of seats) {
      const mapSeat: SeatMapSeat = {
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        category: seat.category,
        status: selectedIds.has(seat.id) ? "selected" : seat.isActive ? "active" : "inactive",
      };
      const current = grouped[grouped.length - 1];
      if (current && current.label === seat.rowLabel) current.seats.push(mapSeat);
      else grouped.push({ label: seat.rowLabel, seats: [mapSeat] });
    }
    return grouped;
  }, [seats, selectedIds]);

  const selectedSeats = seats.filter((seat) => selectedIds.has(seat.id));

  function toggleSeat(seat: SeatMapSeat) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  function toggleRow(row: SeatMapRow) {
    setSelectedIds((current) => {
      const allSelected = row.seats.every((seat) => current.has(seat.id));
      const next = new Set(current);
      for (const seat of row.seats) {
        if (allSelected) next.delete(seat.id);
        else next.add(seat.id);
      }
      return next;
    });
  }

  function seatVariant(mapSeat: SeatMapSeat) {
    const color = categoryColors.get(mapSeat.category)?.solid ?? "bg-ocean text-cream";
    const muted = mapSeat.status === "inactive" ? `${color} opacity-30 grayscale` : color;
    // A ring instead of swapping the fill to gold — gold is already a category
    // colour in this palette, so overriding the fill made an edited vip seat
    // indistinguishable from an untouched one. The ring sits on top of
    // whatever colour the seat already has, so its category stays readable
    // while it's selected.
    const ring = mapSeat.status === "selected" ? " ring-2 ring-offset-2 ring-ocean-dark" : "";
    return { className: muted + ring };
  }

  return (
    <div ref={containerRef}>
      <SeatMap
        rows={rows}
        seatVariant={seatVariant}
        onSeatClick={toggleSeat}
        onRowLabelClick={toggleRow}
        seatTooltip={(seat) => `Ряд ${seat.rowLabel}, место ${seat.seatNumber} — ${categoryLabel(seat.category)}`}
        legend={[
          ...Array.from(categoryColors.entries()).map(([category, color]) => ({
            swatchClassName: color.solid.split(" ")[0],
            label: categoryLabel(category),
          })),
          { swatchClassName: "bg-ocean/10", label: "Скрыто (приглушено)" },
        ]}
      />

      {selectedSeats.length > 0 && (
        <SeatBulkPanel
          key={selectedSeats.map((seat) => seat.id).sort().join(",")}
          seats={selectedSeats}
          existingCategories={Array.from(categoryColors.keys())}
          onDone={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
