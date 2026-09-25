"use client";

import { useActionState, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import type { EventTicketTypeRecord } from "@/lib/eventTicketTypes";
import type { FormState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/**
 * Shared by "add a new ticket type" and "edit an existing one" — same fields, only
 * the defaults and the action differ. categories comes from the hall's own seat
 * map (listHallSeatCategories) when the event has a hall, so staff can only price
 * a category the seat grid actually has; with no hall, it is free text instead —
 * there is no seat map to check it against.
 */
export default function TicketTypeForm({
  eventId,
  ticketType,
  categories,
  action,
  submitLabel,
}: {
  eventId: string;
  ticketType?: EventTicketTypeRecord;
  categories: string[];
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [isFree, setIsFree] = useState(ticketType?.isFree ?? false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="event_id" value={eventId} />
      {ticketType && <input type="hidden" name="id" value={ticketType.id} />}

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div>
        <label className={LABEL} htmlFor={`category-${ticketType?.id ?? "new"}`}>
          Категория мест
        </label>
        {categories.length > 0 ? (
          <select
            id={`category-${ticketType?.id ?? "new"}`}
            name="category"
            defaultValue={ticketType?.category ?? categories[0]}
            className={INPUT}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              id={`category-${ticketType?.id ?? "new"}`}
              name="category"
              defaultValue={ticketType?.category ?? ""}
              placeholder="standard"
              className={INPUT}
            />
            <p className="text-xs text-ocean/40 mt-1.5">
              У мероприятия нет зала, так что список категорий взять неоткуда — впишите её сами так же, как она
              будет называться в зале, когда его привяжете.
            </p>
          </>
        )}
      </div>

      <BilingualField
        kkName="name_kk"
        ruName="name_ru"
        label="Название билета"
        defaultKk={ticketType?.nameKk}
        defaultRu={ticketType?.nameRu}
        placeholderKk="Стандарт"
        placeholderRu="Стандарт"
      />

      <div>
        <label className="flex items-center gap-2.5 text-sm text-ocean/70 cursor-pointer mb-3">
          <input
            type="checkbox"
            name="is_free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="w-4 h-4 accent-ocean shrink-0"
          />
          Бесплатно
        </label>

        {!isFree && (
          <div className="sm:w-1/2 sm:pr-2">
            <label className={LABEL} htmlFor={`price-${ticketType?.id ?? "new"}`}>
              Цена, ₸
            </label>
            <input
              id={`price-${ticketType?.id ?? "new"}`}
              name="price"
              type="number"
              min={0.01}
              step={0.01}
              required
              defaultValue={ticketType && !ticketType.isFree ? ticketType.price : undefined}
              className={INPUT}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Сохранение…" : submitLabel}
      </button>
    </form>
  );
}
