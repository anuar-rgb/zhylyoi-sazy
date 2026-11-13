"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { rememberTicket } from "@/lib/myTickets";
import { createBooking, type CreateBookingResult } from "@/app/actions/bookings";
import type { RowPlacements } from "@/lib/hallRowLayout";
import SeatMap, { assignCategoryColors, type SeatMapRow, type SeatMapSeat } from "@/components/SeatMap";
import { sectionLabel, seatName } from "@/lib/hallSections";
import { categoryLabel } from "@/lib/seatCategories";
import { isEmail } from "@/lib/email";
import { clearDraft, isBlankDraft, readDraft, sessionDraftStorage, writeDraft } from "@/lib/formDraft";

/** What survives a reload of this page: the chosen seats and the email (not the consent). */
type SeatDraft = { seatIds: string[]; email: string };

export type SeatOption = {
  id: string;
  section: string;
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
  zoom: { zoomIn: string; zoomOut: string; fit: string; hint: string };
  selected: string;
  row: string;
  seat: string;
  total: string;
  email: string;
  emailHint: string;
  working: string;
  pay: string;
  noOnlinePayment: string;
  confirm: string;
  consent: string;
  restored: string;
  restoredSomeTaken: string;
};

// The wording is fixed here, not in a translation file: it is one screen and it changes with the code.
const TEXTS: Record<"ru" | "kk", Texts> = {
  ru: {
    errors: {
      email: "Введите электронную почту, например: name@mail.kz",
      consent: "Для оформления заказа нужно дать согласие на обработку данных.",
      no_seats: "Выберите хотя бы одно место.",
      unavailable: "Билеты для этого мероприятия сейчас недоступны.",
      seat_taken: "Одно из выбранных мест только что заняли — выберите другое.",
      failed: "Не удалось оформить заказ. Попробуйте ещё раз.",
    },
    taken: "Место занято",
    noPrice: "Цена для этой категории ещё не задана",
    free: "бесплатно",
    created: "Заказ оформлен",
    legendTaken: "Занято / недоступно",
    stage: "Сцена",
    scrollHint: "Листайте схему в стороны",
    zoom: { zoomIn: "Приблизить", zoomOut: "Отдалить", fit: "Весь зал", hint: "Приблизьте схему двумя пальцами или кнопкой +" },
    selected: "Выбрано мест",
    row: "Ряд",
    seat: "место",
    total: "Итого",
    email: "Электронная почта",
    emailHint: "Сюда придут билеты. Они также появятся на странице заказа.",
    working: "Оформление…",
    pay: "Перейти к оплате",
    noOnlinePayment: "Оплата картой онлайн пока не подключена. Купить билеты можно будет позже.",
    confirm: "Подтвердить",
    consent: "Даю согласие на обработку персональных данных",
    restored: "Ваш выбор восстановлен.",
    restoredSomeTaken: "Ваш выбор восстановлен, но часть мест уже заняли. Выберите вместо них другие.",
  },
  kk: {
    errors: {
      email: "Электрондық поштаңызды енгізіңіз, мысалы: name@mail.kz",
      consent: "Тапсырыс беру үшін деректерді өңдеуге келісім беру қажет.",
      no_seats: "Кемінде бір орынды таңдаңыз.",
      unavailable: "Бұл іс-шараға билеттер қазір қолжетімсіз.",
      seat_taken: "Таңдалған орындардың бірін жаңа ғана алып қойды — басқасын таңдаңыз.",
      failed: "Тапсырысты рәсімдеу сәтсіз аяқталды. Қайталап көріңіз.",
    },
    taken: "Орын бос емес",
    noPrice: "Бұл санат үшін баға әлі белгіленбеген",
    free: "тегін",
    created: "Тапсырыс рәсімделді",
    legendTaken: "Бос емес / қолжетімсіз",
    stage: "Сахна",
    scrollHint: "Схеманы бүйірге жылжытыңыз",
    zoom: { zoomIn: "Үлкейту", zoomOut: "Кішірейту", fit: "Бүкіл зал", hint: "Схеманы екі саусақпен немесе + түймесімен үлкейтіңіз" },
    selected: "Таңдалған орын",
    row: "Қатар",
    seat: "орын",
    total: "Барлығы",
    email: "Электрондық пошта",
    emailHint: "Билеттер осы мекенжайға келеді. Олар тапсырыс бетінде де пайда болады.",
    working: "Рәсімделуде…",
    pay: "Төлемге өту",
    noOnlinePayment: "Картамен онлайн төлем әзірге қосылмаған. Билетті кейінірек сатып алуға болады.",
    confirm: "Растау",
    consent: "Дербес деректерді өңдеуге келісім беремін",
    restored: "Таңдауыңыз қалпына келтірілді.",
    restoredSomeTaken: "Таңдауыңыз қалпына келтірілді, бірақ кейбір орындарды алып қойыпты. Орнына басқаларын таңдаңыз.",
  },
};

/**
 * The whole booking flow on one client component: pick seats, see the running
 * total, fill in contact details, submit. createBooking is the only thing that
 * decides price and availability — this component never computes a total that it
 * trusts, only one it displays; the real total comes back from the server on
 * success, and a stale local total never reaches the database.
 */
export default function SeatPicker({
  eventId,
  rows,
  rowShape,
  numbering,
  rowLayouts,
  bankMethodId,
}: {
  eventId: string;
  /** Paid through this bank method alone: the one button takes the buyer straight to the bank's form. */
  bankMethodId?: string | null;
  /** The hall's row shape, so the map is drawn as the hall is set up. */
  rowShape?: "curved" | "straight";
  /** The hall's numbering direction: seat 1 at the left or the right. */
  numbering?: "ltr" | "rtl";
  /** Rows set up on their own: where each one stands within its section. */
  rowLayouts?: RowPlacements;
  rows: { section: string; label: string; seats: SeatOption[] }[];
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const lang = useLocale() === "kk" ? "kk" : "ru";
  const t = TEXTS[lang];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buyerEmail, setBuyerEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const draftKey = `seats:${eventId}`;
  // Saving starts only once the saved draft has been read, so the first, empty render cannot overwrite it.
  const draftRead = useRef(false);

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

  // After a reload, offer back the seats and email chosen in this tab. The map was just drawn from the
  // server's current state, so a seat someone else has taken meanwhile is marked taken and is dropped
  // here; createBooking checks every seat again in any case.
  useEffect(() => {
    const draft = readDraft<SeatDraft>(sessionDraftStorage(), draftKey);
    draftRead.current = true;
    if (!draft) return;
    const free = (draft.seatIds ?? []).filter((id) => {
      const seat = seatsById.get(id);
      return seat && !seat.taken && seat.price !== null;
    });
    /* eslint-disable react-hooks/set-state-in-effect -- restoring from browser storage has to wait for
       hydration: reading it during render would make the server and client markup differ. */
    if (free.length > 0) setSelected(new Set(free));
    if (draft.email) setBuyerEmail(draft.email);
    if ((draft.seatIds ?? []).length > 0) setNotice(free.length < draft.seatIds.length ? t.restoredSomeTaken : t.restored);
    /* eslint-enable react-hooks/set-state-in-effect */
    // On a phone the order card sits below the map, so a lost seat is also said where it is seen at once.
    if (free.length < (draft.seatIds ?? []).length) feedback.error(t.restoredSomeTaken);
    // Once, on arrival: seatsById and the texts are rebuilt every render but describe the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftRead.current) return;
    const draft: SeatDraft = { seatIds: [...selected], email: buyerEmail };
    if (isBlankDraft(draft)) clearDraft(sessionDraftStorage(), draftKey);
    else writeDraft(sessionDraftStorage(), draftKey, draft);
  }, [selected, buyerEmail, draftKey]);

  function toggleSeat(seat: SeatOption) {
    if (seat.taken || seat.price === null) return;
    setNotice(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  const seatMapRows: SeatMapRow[] = rows.map((row) => ({
    section: row.section,
    label: row.label,
    seats: row.seats.map((seat) => ({
      id: seat.id,
      section: seat.section,
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
    if (!isEmail(buyerEmail)) {
      setError(t.errors.email);
      feedback.error(t.errors.email);
      document.getElementById("buyer_email")?.focus();
      return;
    }

    startTransition(async () => {
      const result = await createBooking({
        eventId,
        buyerEmail,
        locale: lang,
        seatIds: [...selected],
        consent,
      });

      if (!result.ok) {
        setError(t.errors[result.error]);
        feedback.error(t.errors[result.error]);
        return;
      }

      rememberTicket(result.accessToken);
      // The order exists and holds the seats: from here the order page is the way back, not the draft.
      clearDraft(sessionDraftStorage(), draftKey);

      // The seats are held from here on. Should the form not open, the order page offers it again.
      if (bankMethodId && total > 0) {
        try {
          const res = await fetch("/api/payments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: result.accessToken, methodId: bankMethodId }),
          });
          const data = (await res.json().catch(() => null)) as { redirectUrl?: string } | null;
          if (res.ok && data?.redirectUrl) {
            window.location.assign(data.redirectUrl);
            return;
          }
        } catch {
          // falls through to the order page
        }
      }

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
          rowShape={rowShape}
          numbering={numbering}
          rowLayouts={rowLayouts}
          seatVariant={seatVariant}
          seatTooltip={seatTooltip}
          stageLabel={t.stage}
          scrollHint={t.scrollHint}
          zoom={t.zoom}
          sectionTitle={(section) => sectionLabel(section, lang)}
          onSeatClick={handleSeatMapClick}
          legend={[
            ...Array.from(categoryColors.entries()).map(([category, color]) => ({
              swatchClassName: color.solid.split(" ")[0],
              label: categoryLabel(category, lang),
            })),
            { swatchClassName: "bg-ocean/10", label: t.legendTaken },
          ]}
        />
      </div>

      <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6 lg:sticky lg:top-24">
        {notice && (
          <p role="status" className="text-sm text-ocean bg-gold/10 border border-gold/30 rounded-2xl px-4 py-3 mb-4">
            {notice}
          </p>
        )}
        <p className="font-bold text-ocean mb-3">
          {t.selected}: {selectedSeats.length}
        </p>

        {selectedSeats.length > 0 && (
          <ul className="text-sm text-ocean/70 space-y-1 mb-4">
            {selectedSeats.map((seat) => (
              <li key={seat.id} className="flex items-center justify-between gap-2">
                <span>{seatName(seat, lang)}</span>
                <span className="shrink-0">{seat.isFree ? t.free : `${seat.price} ₸`}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-lg font-bold text-ocean mb-4">{t.total}: {total > 0 ? `${total} ₸` : t.free}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ocean/70 mb-1.5" htmlFor="buyer_email">
              {t.email}
            </label>
            <input
              id="buyer_email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="name@mail.kz"
              aria-invalid={buyerEmail !== "" && !isEmail(buyerEmail)}
              aria-describedby="buyer_email_hint"
              required
              // text-base, not text-sm: below 16px, iOS/Android auto-zoom the
              // page on focus, and the header's fixed mobile menu then sits
              // mispositioned relative to that zoomed viewport until it resets.
              className="w-full px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-base text-ocean focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <p id="buyer_email_hint" className="text-xs text-ocean/50 mt-1.5 px-1">
              {t.emailHint}
            </p>
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
          {total > 0 && !bankMethodId && <p className="text-sm text-ocean bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{t.noOnlinePayment}</p>}

          <button
            type="submit"
            disabled={pending || selectedSeats.length === 0 || !consent || (total > 0 && !bankMethodId)}
            className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? t.working : total > 0 ? t.pay : t.confirm}
          </button>
        </form>
      </div>
    </div>
  );
}
