"use client";

import { useActionState } from "react";
import { CONTENT_GROUPS } from "@/lib/siteContent";
import type { ContentOverrides } from "@/lib/orgContent";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default function ContentForm({
  overrides,
  action,
}: {
  overrides: ContentOverrides;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null, saved: null });

  const changedCount = Object.keys(overrides).length;

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">Тексты сайта</h1>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      <p className="text-sm text-ocean/60">
        Надписи на главной странице и на странице «Контакты». Поля заполнены текущим текстом на казахском — меняйте
        те, что нужно, перевод на русский подставится сам. Верните поле к исходному тексту и сохраните, чтобы убрать
        замену.
        {changedCount > 0 && <> Сейчас изменено: {changedCount}.</>}
      </p>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}
      {state.saved !== null && !state.error && (
        <p className="bg-gold/15 border border-gold/40 text-ocean-dark text-sm rounded-2xl px-4 py-3">
          Сохранено. Изменения уже на сайте.
        </p>
      )}

      {CONTENT_GROUPS.map((group, index) => (
        <details key={group.id} className={`${CARD} overflow-hidden`} open={index === 0}>
          <summary className="cursor-pointer select-none px-5 sm:px-6 py-4 font-semibold text-ocean hover:bg-cream/30">
            {group.title}
          </summary>
          <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-cream-dark">
            {group.hint && <p className="text-xs text-ocean/40 mb-4">{group.hint}</p>}
            <div className="space-y-4">
              {group.fields.map((field) => {
                const override = overrides[field.key];
                const kk = override?.kk ?? field.kk;
                const ru = override?.ru ?? field.ru;

                return (
                  <BilingualField
                    key={field.key}
                    kkName={`${field.key}__kk`}
                    ruName={`${field.key}__ru`}
                    label={field.label}
                    defaultKk={kk}
                    defaultRu={ru}
                    textarea={field.long}
                  />
                );
              })}
            </div>
          </div>
        </details>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
