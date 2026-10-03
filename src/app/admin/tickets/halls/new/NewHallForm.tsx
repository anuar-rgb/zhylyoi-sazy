"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState } from "react";
import Link from "next/link";
import BilingualField from "@/components/admin/BilingualField";
import GridFieldset from "../GridFieldset";
import { createHall } from "../actions";
import type { FormState } from "../actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * Creates a hall and its initial seat grid in one step — unlike editing a
 * hall, which splits name and grid into two separate forms (see
 * HallForm/GenerateGridForm on the edit page), a brand new hall has no grid
 * yet to protect, so rows/seats-per-row are required here.
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
        <p className="text-sm font-semibold text-ocean">Сетка мест</p>
        <GridFieldset required />
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
