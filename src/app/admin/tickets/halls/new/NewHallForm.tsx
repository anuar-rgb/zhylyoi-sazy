"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState, useState } from "react";
import Link from "next/link";
import BilingualField from "@/components/admin/BilingualField";
import GridFieldset from "../GridFieldset";
import { createHall } from "../actions";
import type { FormState } from "../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent disabled:opacity-40";

/** The sections a hall may have besides the parter, with a sensible starting size. */
const EXTRA_SECTIONS = [
  { id: "left", title: "Левый сектор", hint: "боковые ряды слева от партера", rows: 5, seats: 4 },
  { id: "right", title: "Правый сектор", hint: "боковые ряды справа от партера", rows: 5, seats: 4 },
  { id: "balcony", title: "Балкон", hint: "ряды позади партера, выше", rows: 3, seats: 15 },
] as const;

function SectionToggle({ section }: { section: (typeof EXTRA_SECTIONS)[number] }) {
  const [on, setOn] = useState(false);
  return (
    <div className="border border-cream-dark rounded-2xl p-4">
      <label className="flex items-start gap-2.5 text-sm text-ocean cursor-pointer">
        <input
          type="checkbox"
          name={`section_${section.id}`}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
        />
        <span>
          <span className="font-semibold">{section.title}</span>
          <span className="text-ocean/50"> — {section.hint}</span>
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="text-xs text-ocean/60">
          Рядов
          <input
            name={`${section.id}_rows`}
            type="number"
            min={1}
            max={100}
            defaultValue={section.rows}
            disabled={!on}
            required={on}
            className={`${INPUT} mt-1`}
          />
        </label>
        <label className="text-xs text-ocean/60">
          Мест в ряду
          <input
            name={`${section.id}_seats`}
            type="number"
            min={1}
            max={100}
            defaultValue={section.seats}
            disabled={!on}
            required={on}
            className={`${INPUT} mt-1`}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Creates a hall and its initial seat grid in one step — unlike editing a
 * hall, which splits name and grid into two separate forms (see
 * HallForm/GenerateGridForm on the edit page), a brand new hall has no grid
 * yet to protect, so rows/seats-per-row are required here.
 *
 * The parter (in front of the stage) is always there; side sections and a balcony are optional
 * and folded away, since most halls have none. Each is numbered on its own, and any of them can
 * also be added, resized or removed later on the hall's edit page.
 */
export default function NewHallForm() {
  const initialState: FormState = { error: null };
  const [state, formAction, pending] = useActionState(createHall, initialState);
  useActionToast(state, "Сохранено");

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Новый зал</h1>
        <Link href="/admin/tickets/halls" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <BilingualField
          kkName="name_kk"
          ruName="name_ru"
          label="Название зала"
          placeholderKk="Үлкен зал"
          placeholderRu="Большой зал"
        />

        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-5 pt-5 border-t border-cream-dark">
          <input type="checkbox" name="is_active" defaultChecked className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
          <span>Зал используется</span>
        </label>
      </div>

      <div className={`${CARD} space-y-4`}>
        <div>
          <p className="text-sm font-semibold text-ocean">Партер</p>
          <p className="text-xs text-ocean/50 mt-0.5">Основные ряды перед сценой.</p>
        </div>
        <GridFieldset required />

        <details className="group border-t border-cream-dark pt-4">
          <summary className="flex items-center gap-2 cursor-pointer select-none list-none text-sm font-semibold text-ocean">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Дополнительные сектора
            <span className="font-normal text-ocean/50">(необязательно)</span>
          </summary>
          <p className="text-xs text-ocean/50 mt-3 mb-3">
            Ряды и места в каждом секторе нумеруются отдельно, на билете будет, например, «Балкон, ряд 2, место 5». Сектора
            можно добавить и позже, на странице зала.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            {EXTRA_SECTIONS.map((section) => (
              <SectionToggle key={section.id} section={section} />
            ))}
          </div>
        </details>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Создание…" : "Создать зал"}
        </button>
        <Link href="/admin/tickets/halls" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
