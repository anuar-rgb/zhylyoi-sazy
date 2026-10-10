"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SeatMap, { assignCategoryColors, seatsToRows, type SeatMapRow, type SeatMapSeat } from "@/components/SeatMap";
import EventSeatBulkPanel from "./EventSeatBulkPanel";
import type { HallSeatRecord } from "@/lib/halls";
import { categoryLabel } from "@/lib/seatCategories";
import { seatName } from "@/lib/hallSections";

/**
 * The event's own seat-category map — separate from the hall's SeatMapEditor
 * (Залы → зал → места), which only edits the hall's base layout now. A seat
 * with no override here shows here (and sells) as "standard" regardless of
 * that base layout, so a hall's vip tables don't follow it into every event
 * held there — see event_seat_categories.
 */
export default function EventSeatMap({
  eventId,
  seats,
  categories,
}: {
  eventId: string;
  seats: HallSeatRecord[];
  /** The categories seats can be given here: the hall's (Стандарт, VIP, its own) and this event's. */
  categories: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

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

  const rows: SeatMapRow[] = useMemo(
    () =>
      seatsToRows(
        seats.map(
          (seat): SeatMapSeat => ({
            id: seat.id,
            section: seat.section,
            rowLabel: seat.rowLabel,
            seatNumber: seat.seatNumber,
            category: seat.category,
            status: selectedIds.has(seat.id) ? "selected" : "active",
          })
        )
      ),
    [seats, selectedIds]
  );

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
    const ring = mapSeat.status === "selected" ? " ring-2 ring-offset-2 ring-ocean-dark" : "";
    return { className: color + ring };
  }

  return (
    <div ref={containerRef}>
      <SeatMap
        rows={rows}
        seatVariant={seatVariant}
        onSeatClick={toggleSeat}
        onRowLabelClick={toggleRow}
        seatTooltip={(seat) => `${seatName(seat)} — ${categoryLabel(seat.category)}`}
        legend={Array.from(categoryColors.entries()).map(([category, color]) => ({
          swatchClassName: color.solid.split(" ")[0],
          label: categoryLabel(category),
        }))}
      />

      {selectedSeats.length > 0 && (
        <EventSeatBulkPanel
          key={selectedSeats.map((seat) => seat.id).sort().join(",")}
          eventId={eventId}
          seats={selectedSeats}
          existingCategories={categories}
          onDone={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
