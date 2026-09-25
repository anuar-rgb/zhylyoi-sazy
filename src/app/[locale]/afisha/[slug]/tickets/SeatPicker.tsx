"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBooking, type CreateBookingResult } from "@/app/actions/bookings";

export type SeatOption = {
  id: string;
  rowLabel: string;
  seatNumber: number;
  category: string;
  taken: boolean;
  /** null when no active ticket type prices this category — shown but not selectable. */
  price: number | null;
  isFree: boolean;
  ticketName: string;
};

type BookingError = Extract<CreateBookingResult, { ok: false }>["error"];

const ERROR_MESSAGES: Record<BookingError, string> = {
  missing: "Укажите имя и телефон.",
  no_seats: "Выберите хотя бы одно место.",
  unavailable: "Билеты для этого мероприятия сейчас недоступны.",
  seat_taken: "Одно из выбранных мест только что заняли — выберите другое.",
  failed: "Не удалось оформить бронь. Попробуйте ещё раз.",
};

/**
 * The whole booking flow on one client component: pick seats, see the running
 * total, fill in contact details, submit. createBooking is the only thing that
 * decides price and availability — this component never computes a total that it
 * trusts, only one it displays; the real total comes back from the server on
 * success, and a stale local total never reaches the database.
 */
export default function SeatPicker({ eventId, rows }: { eventId: string; rows: { label: string; seats: SeatOption[] }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSeats = rows.flatMap((r) => r.seats);
  const selectedSeats = allSeats.filter((s) => selected.has(s.id));
  const total = selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0);

  function toggleSeat(seat: SeatOption) {
    if (seat.taken || seat.price === null) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedSeats.length === 0) {
      setError(ERROR_MESSAGES.no_seats);
      return;
    }

    startTransition(async () => {
      const result = await createBooking({
        eventId,
        buyerName,
        buyerPhone,
        seatIds: [...selected],
      });

      if (!result.ok) {
        setError(ERROR_MESSAGES[result.error]);
        return;
      }

      router.push(`/my-ticket/${result.accessToken}`);
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-5"
          >
            <p className="text-xs font-semibold text-ocean/40 mb-3">Ряд {row.label}</p>
            <div className="flex flex-wrap gap-2">
              {row.seats.map((seat) => {
                const isSelected = selected.has(seat.id);
                const unavailable = seat.taken || seat.price === null;

                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={unavailable}
                    onClick={() => toggleSeat(seat)}
                    title={
                      seat.taken
                        ? "Место занято"
                        : seat.price === null
                          ? "Цена для этой категории ещё не задана"
                          : `${seat.ticketName} — ${seat.isFree ? "бесплатно" : `${seat.price} ₸`}`
                    }
                    className={`w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors ${
                      seat.taken
                        ? "bg-ocean/10 text-ocean/30 cursor-not-allowed"
                        : seat.price === null
                          ? "bg-cream text-ocean/20 cursor-not-allowed"
                          : isSelected
                            ? "bg-gold text-ocean-dark"
                            : "bg-cream/60 text-ocean hover:bg-gold/30"
                    }`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6 lg:sticky lg:top-24">
        <p className="font-bold text-ocean mb-3">
          Выбрано мест: {selectedSeats.length}
        </p>

        {selectedSeats.length > 0 && (
          <ul className="text-sm text-ocean/70 space-y-1 mb-4">
            {selectedSeats.map((seat) => (
              <li key={seat.id} className="flex items-center justify-between gap-2">
                <span>
                  Ряд {seat.rowLabel}, место {seat.seatNumber}
                </span>
                <span className="shrink-0">{seat.isFree ? "бесплатно" : `${seat.price} ₸`}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-lg font-bold text-ocean mb-4">Итого: {total > 0 ? `${total} ₸` : "бесплатно"}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="buyer_name">
              Имя
            </label>
            <input
              id="buyer_name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="buyer_phone">
              Телефон
            </label>
            <input
              id="buyer_phone"
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={pending || selectedSeats.length === 0}
            className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Оформление…" : total > 0 ? "Забронировать" : "Подтвердить"}
          </button>
        </form>
      </div>
    </div>
  );
}
