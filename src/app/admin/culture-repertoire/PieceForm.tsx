"use client";

import { useActionState } from "react";
import Link from "next/link";
import { REPERTOIRE_CATEGORIES, REPERTOIRE_CATEGORY_ADMIN_LABELS } from "@/lib/repertoireFields";
import type { CultureRepertoireRecord } from "@/lib/cultureRepertoire";
import TranslateAllButton from "@/components/admin/TranslateAllButton";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const TRANSLATE_PAIRS = [
  { kk: "title_kk", ru: "title_ru" },
  { kk: "author_kk", ru: "author_ru" },
  { kk: "note_kk", ru: "note_ru" },
];

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

function Field({
  name,
  label,
  defaultValue,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  // Omitted because it is declared above with a wider type: the record fields are
  // nullable, and an input's own defaultValue is not.
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  return (
    <div>
      <label className={LABEL} htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} className={INPUT} {...rest} />
    </div>
  );
}

export default function PieceForm({
  piece,
  action,
  heading,
}: {
  piece?: CultureRepertoireRecord;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-5">
      {piece && <input type="hidden" name="id" value={piece.id} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <div className="flex items-center gap-4">
          <TranslateAllButton pairs={TRANSLATE_PAIRS} />
          <Link href="/admin/culture-repertoire" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
            Отмена
          </Link>
        </div>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Произведение</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField kkName="title_kk" ruName="title_ru" label="Название" defaultKk={piece?.titleKk} defaultRu={piece?.titleRu} />
          <BilingualField
            kkName="author_kk"
            ruName="author_ru"
            label="Автор"
            defaultKk={piece?.authorKk}
            defaultRu={piece?.authorRu}
            placeholderKk="Халық әні"
            placeholderRu="Народная песня"
          />
          <BilingualField
            kkName="note_kk"
            ruName="note_ru"
            label="Примечание"
            defaultKk={piece?.noteKk}
            defaultRu={piece?.noteRu}
            placeholderKk="Өңдеген: ..."
            placeholderRu="Обработка: ..."
          />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Название на карточке берётся в кавычки. Примечание — маленькая подпись под автором: кто обработал, чьи
          слова. Оставьте пустым — строка не появится.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Категория и порядок</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL} htmlFor="category">
              Категория
            </label>
            <select id="category" name="category" defaultValue={piece?.category ?? "kui"} className={INPUT}>
              {REPERTOIRE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {REPERTOIRE_CATEGORY_ADMIN_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
          <Field
            name="sort_order"
            label="Порядок в списке"
            type="number"
            defaultValue={String(piece?.sortOrder ?? 0)}
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-4">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={piece?.isActive ?? true}
            className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
          />
          <span>Показывать на сайте</span>
        </label>

        <p className="text-xs text-ocean/40 mt-3">
          Категория выбирается из списка, а не вписывается: она задаёт и подпись на метке, и её цвет, причём
          подпись на обоих языках подставляется сама. Порядок идёт с шагом десять — это же число стоит номером на
          карточке.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/culture-repertoire" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
