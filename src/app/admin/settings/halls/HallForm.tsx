"use client";

import { useActionState } from "react";
import Link from "next/link";
import BilingualField from "@/components/admin/BilingualField";
import type { HallRecord } from "@/lib/halls";
import type { FormState } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

export default function HallForm({
  hall,
  action,
  heading,
}: {
  hall?: HallRecord;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-5">
      {hall && <input type="hidden" name="id" value={hall.id} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/settings/halls" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
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
          defaultKk={hall?.nameKk}
          defaultRu={hall?.nameRu}
          placeholderKk="Үлкен зал"
          placeholderRu="Большой зал"
        />

        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-5 pt-5 border-t border-cream-dark">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={hall?.isActive ?? true}
            className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
          />
          <span>Зал используется</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/settings/halls" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
