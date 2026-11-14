"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createInstitutionAction } from "../actions";
import { CARD, INITIAL, INPUT, LABEL, Notice } from "../ui";

export default function NewInstitutionForm() {
  const [state, action, pending] = useActionState(createInstitutionAction, INITIAL);

  return (
    <form action={action} className="space-y-5">
      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Учреждение</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL} htmlFor="name_kk">Полное название (қаз.)</label>
            <input id="name_kk" name="name_kk" className={INPUT} placeholder="«…» аудандық мәдениет үйі" />
          </div>
          <div>
            <label className={LABEL} htmlFor="name_ru">Полное название (рус.)</label>
            <input id="name_ru" name="name_ru" className={INPUT} placeholder="Дом культуры «…»" />
          </div>
          <div>
            <label className={LABEL} htmlFor="short_name_kk">Короткое название (қаз.)</label>
            <input id="short_name_kk" name="short_name_kk" className={INPUT} placeholder="для шапки сайта" />
          </div>
          <div>
            <label className={LABEL} htmlFor="short_name_ru">Короткое название (рус.)</label>
            <input id="short_name_ru" name="short_name_ru" className={INPUT} placeholder="для шапки сайта" />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="domain">Домен сайта</label>
            <input id="domain" name="domain" required className={INPUT} placeholder="dk-kulsary.kz" autoComplete="off" />
          </div>
        </div>
        <p className="text-xs text-ocean/40 mt-3">
          Домен учреждение покупает само. В его настройках у регистратора нужна запись A на адрес сервера 77.243.80.210 —
          тогда сайт откроется, а сертификат HTTPS появится сам в течение минуты. Остальное (адрес, логотип, тексты)
          учреждение заполнит в своей панели.
        </p>
      </div>

      <Notice state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {pending ? "Создание…" : "Создать учреждение"}
        </button>
        <Link href="/admin/platform" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
