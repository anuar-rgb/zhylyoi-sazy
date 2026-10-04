"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { rememberTicket } from "@/lib/myTickets";
import { createBooking, type CreateBookingResult } from "@/app/actions/bookings";
import SeatMap, { assignCategoryColors, type SeatMapRow, type SeatMapSeat } from "@/components/SeatMap";

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

type Texts = {
  errors: Record<BookingError, string>;
  taken: string;
  noPrice: string;
  free: string;
  created: string;
  legendTaken: string;
  stage: string;
  scrollHint: string;
  selected: string;
  row: string;
  seat: string;
  total: string;
  name: string;
  phone: string;
  working: string;
  book: string;
  confirm: string;
  consent: string;
};

// The wording is fixed here, not in a translation file: it is one screen and it changes with the code.
const TEXTS: Record<"ru" | "kk", Texts> = {
  ru: {
    errors: {
      missing: "Укажите имя и телефон.",
      consent: "Для брони нужно дать согласие на обработку данных.",
      no_seats: "Выберите хотя бы одно место.",
      unavailable: "Билеты для этого мероприятия сейчас недоступны.",
      seat_taken: "Одно из выбранных мест только что заняли — выберите другое.",
      failed: "Не удалось оформить бронь. Попробуйте ещё раз.",
    },
    taken: "Место занято",
    noPrice: "Цена для этой категории ещё не задана",
    free: "бесплатно",
    created: "Бронь создана",
    legendTaken: "Занято / недоступно",
    stage: "Сцена",
    scrollHint: "Листайте схему в стороны",
    selected: "Выбрано мест",
    row: "Ряд",
    seat: "место",
    total: "Итого",
    name: "Имя",
    phone: "Телефон",
    working: "Оформление…",
    book: "Забронировать",
    confirm: "Подтвердить",
    consent: "Даю согласие на обработку персональных данных",
  },
  kk: {
    errors: {
      missing: "Аты-жөніңіз бен телефоныңызды көрсетіңіз.",
      consent: "Броньдау үшін деректерді өңдеуге келісім беру қажет.",
      no_seats: "Кемінде бір орынды таңдаңыз.",
      unavailable: "Бұл іс-шараға билеттер қазір қолжетімсіз.",
      seat_taken: "Таңдалған орындардың бірін жаңа ғана алып қойды — басқасын таңдаңыз.",
      failed: "Броньдау сәтсіз аяқталды. Қайталап көріңіз.",
    },
    taken: "Орын бос емес",
    noPrice: "Бұл санат үшін баға әлі белгіленбеген",
    free: "тегін",
    created: "Бронь жасалды",
    legendTaken: "Бос емес / қолжетімсіз",
    stage: "Сахна",
    scrollHint: "Схеманы бүйірге жылжытыңыз",
    selected: "Таңдалған орын",
    row: "Қатар",
    seat: "орын",
    total: "Барлығы",
    name: "Аты-жөні",
    phone: "Телефон",
    working: "Рәсімделуде…",
    book: "Броньдау",
    confirm: "Растау",
    consent: "Дербес деректерді өңдеуге келісім беремін",
  },
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
  const feedback = useFeedback();
  const t = TEXTS[useLocale() === "kk" ? "kk" : "ru"];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSeats = rows.flatMap((r) => r.seats);
  const selectedSeats = allSeats.filter((s) => selected.has(s.id));
  const total = selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0);

  // SeatMap only ever hands back the reduced {id, rowLabel, seatNumber,
  // category, status} shape — this is how its callbacks recover price/taken/
  // ticketName to decide what a click or a tooltip means.
  const seatsById = new Map(allSeats.map((seat) => [seat.id, seat]));

  // Same pinned vip/standard colours as the admin seat map (SeatMap.tsx) — a
  // buyer needs to tell categories apart at a glance just as much as staff do.
  const categoryColors = assignCategoryColors(allSeats.map((seat) => seat.category));

  function toggleSeat(seat: SeatOption) {
    if (seat.taken || seat.price === null) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  const seatMapRows: SeatMapRow[] = rows.map((row) => ({
    label: row.label,
    seats: row.seats.map((seat) => ({
      id: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      category: seat.category,
      status: seat.taken || seat.price === null ? "taken" : selected.has(seat.id) ? "selected" : "available",
    })),
  }));

  function seatVariant(mapSeat: SeatMapSeat) {
    if (mapSeat.status === "taken") return { className: "bg-ocean/10 text-ocean/25 grayscale", disabled: true };

    const color = categoryColors.get(mapSeat.category) ?? { solid: "bg-ocean text-cream", muted: "bg-ocean/25 text-ocean hover:bg-ocean/40" };
    if (mapSeat.status === "selected") {
      // A ring, not a fill swap: an already-gold vip seat turning "selected
      // gold" would look identical to an untouched one — same reasoning as
      // the admin seat map (SeatMapEditor.tsx).
      return { className: `${color.solid} ring-2 ring-offset-2 ring-ocean-dark` };
    }
    // A muted tint of the same colour for "available" — the full-strength
    // fill is reserved for legend/selected, or a mostly-free hall would read
    // as already half booked.
    return { className: color.muted };
  }

  function seatTooltip(mapSeat: SeatMapSeat): string | undefined {
    const seat = seatsById.get(mapSeat.id);
    if (!seat) return undefined;
    if (seat.taken) return t.taken;
    if (seat.price === null) return t.noPrice;
    return `${seat.ticketName} — ${seat.isFree ? t.free : `${seat.price} ₸`}`;
  }

  function handleSeatMapClick(mapSeat: SeatMapSeat) {
    const seat = seatsById.get(mapSeat.id);
    if (seat) toggleSeat(seat);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedSeats.length === 0) {
      setError(t.errors.no_seats);
      feedback.error(t.errors.no_seats);
      return;
    }

    startTransition(async () => {
      const result = await createBooking({
        eventId,
        buyerName,
        buyerPhone,
        seatIds: [...selected],
        consent,
      });

      if (!result.ok) {
        setError(t.errors[result.error]);
        feedback.error(t.errors[result.error]);
        return;
      }

      rememberTicket(result.accessToken);
      feedback.success(t.created);
      router.push(`/my-ticket/${result.accessToken}`);
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
      {/* min-w-0: a grid item's automatic minimum size is its content's min-content
          width unless told otherwise, and a wide hall's seat row (many seats,
          no wrapping) has a large one. Without this, that width wins on a
          narrow phone — the card grows past the viewport instead of SeatMap's
          own overflow-x-auto ever getting a chance to scroll internally, and
          the page's overflow-x-hidden wrapper (see layout.tsx) just clips it. */}
      <div className="min-w-0 bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-5">
        <SeatMap
          rows={seatMapRows}
          seatVariant={seatVariant}
          seatTooltip={seatTooltip}
          stageLabel={t.stage}
          scrollHint={t.scrollHint}
          onSeatClick={handleSeatMapClick}
          legend={[
            ...Array.from(categoryColors.entries()).map(([category, color]) => ({
              swatchClassName: color.solid.split(" ")[0],
              label: category,
            })),
            { swatchClassName: "bg-ocean/10", label: t.legendTaken },
          ]}
        />
      </div>

      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6 lg:sticky lg:top-24">
        <p className="font-bold text-ocean mb-3">
          {t.selected}: {selectedSeats.length}
        </p>

        {selectedSeats.length > 0 && (
          <ul className="text-sm text-ocean/70 space-y-1 mb-4">
            {selectedSeats.map((seat) => (
              <li key={seat.id} className="flex items-center justify-between gap-2">
                <span>
                  {t.row} {seat.rowLabel}, {t.seat} {seat.seatNumber}
                </span>
                <span className="shrink-0">{seat.isFree ? t.free : `${seat.price} ₸`}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-lg font-bold text-ocean mb-4">{t.total}: {total > 0 ? `${total} ₸` : t.free}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="buyer_name">
              {t.name}
            </label>
            <input
              id="buyer_name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              required
              // text-base, not text-sm: below 16px, iOS/Android auto-zoom the
              // page on focus, and the header's fixed mobile menu then sits
              // mispositioned relative to that zoomed viewport until it resets.
              className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-base text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="buyer_phone">
              {t.phone}
            </label>
            <input
              id="buyer_phone"
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-base text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
            />
            <span>{t.consent}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={pending || selectedSeats.length === 0 || !consent}
            className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? t.working : total > 0 ? t.book : t.confirm}
          </button>
        </form>
      </div>
    </div>
  );
}
