"use client";

import { useActionToast } from "@/components/feedback/FeedbackProvider";
import { useActionState } from "react";
import type { OrganizationRecord } from "@/lib/organization";
import BilingualField from "@/components/admin/BilingualField";
import { formatMapPoint, mapsLink } from "@/lib/mapPoint";
import type { FormState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

function Field({
  name,
  label,
  defaultValue,
  textarea,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  textarea?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  return (
    <div>
      <label className={LABEL} htmlFor={name}>
        {label}
      </label>
      {textarea ? (
        <textarea id={name} name={name} rows={3} defaultValue={defaultValue ?? ""} className={`${INPUT} resize-y`} />
      ) : (
        <input id={name} name={name} defaultValue={defaultValue ?? ""} className={INPUT} {...rest} />
      )}
    </div>
  );
}

export default function SettingsForm({
  organization,
  action,
}: {
  organization: OrganizationRecord;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null, saved: false });
  useActionToast(state, "Настройки сохранены");

  return (
    <form action={formAction} className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-ocean">Настройки учреждения</h1>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="bg-gold/15 border border-gold/40 text-ocean-dark text-sm rounded-2xl px-4 py-3">
          Сохранено. Изменения уже на сайте.
        </p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Название</p>
        <BilingualField kkName="name_kk" ruName="name_ru" label="Название" defaultKk={organization.nameKk} defaultRu={organization.nameRu} />
        <p className="text-xs text-ocean/40 mt-2">Показывается в подвале сайта и на странице «Контакты».</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Контакты</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField
            kkName="address_kk"
            ruName="address_ru"
            label="Адрес"
            defaultKk={organization.addressKk}
            defaultRu={organization.addressRu}
            textarea
          />
          <Field name="phone" label="Телефон" defaultValue={organization.phone} placeholder="+7 778 927 63 87" />
          <Field name="email" label="Электронная почта" defaultValue={organization.email} type="email" />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Подставляются в подвал каждой страницы, в блок контактов на главной, на страницу «Контакты» и в форму
          «Отправить сообщение» (письма идут на эту почту). Адрес вместе с названием предлагается местом проведения
          для новых мероприятий.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Точка на карте</p>
        <Field
          name="map_point"
          label="Ссылка с карты или координаты"
          defaultValue={organization.mapPoint ? formatMapPoint(organization.mapPoint) : null}
          placeholder="https://maps.app.goo.gl/… или 46.9621, 54.0129"
        />
        <p className="text-xs text-ocean/40 mt-2">
          Найдите здание в Google Картах, 2ГИС или Яндекс Картах, нажмите «Поделиться» и вставьте ссылку сюда.
          После сохранения здесь будут координаты. Пустое поле убирает карту с главной.
          {organization.mapPoint && (
            <>
              {" "}
              <a
                href={mapsLink(organization.mapPoint, null) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ocean/60 underline hover:text-gold-dark"
              >
                Проверить на карте
              </a>
            </>
          )}
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Официальные реквизиты</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="legal_name_kk" label="Полное наименование (қаз.)" defaultValue={organization.legalNameKk} textarea />
          <Field name="legal_name_ru" label="Полное наименование (рус.)" defaultValue={organization.legalNameRu} textarea />
          <Field name="bin" label="БИН" defaultValue={organization.bin} inputMode="numeric" maxLength={14} placeholder="12 цифр" />
          <Field name="director" label="Руководитель (ФИО)" defaultValue={organization.director} />
          <Field name="founder_kk" label="Учредитель (қаз.)" defaultValue={organization.founderKk} textarea />
          <Field name="founder_ru" label="Учредитель (рус.)" defaultValue={organization.founderRu} textarea />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Показываются на странице «Контакты» в блоке «Официальные реквизиты учреждения». Пишите как в
          регистрационных документах: банк сверяет их с договором. Автоперевода здесь нет: если поле на одном
          языке пустое, на сайте покажется другой язык.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Сведения о платформе</p>
        <dl className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-ocean/40 mb-0.5">Адрес сайта учреждения</dt>
            <dd className="text-ocean/70 font-medium">{organization.slug}</dd>
          </div>
          <div>
            <dt className="text-xs text-ocean/40 mb-0.5">Тип учреждения</dt>
            <dd className="text-ocean/70 font-medium">{organization.type}</dd>
          </div>
          <div>
            <dt className="text-xs text-ocean/40 mb-0.5">Внутренний номер</dt>
            <dd className="text-ocean/50 font-mono text-xs break-all">{organization.id}</dd>
          </div>
        </dl>
        <p className="text-xs text-ocean/40 mt-3">
          Эти три значения меняются только администратором платформы: по ним сайт находит своё учреждение, и
          правка здесь разорвала бы связь.
        </p>
      </div>

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
