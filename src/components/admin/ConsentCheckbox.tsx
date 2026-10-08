"use client";

import { formatDateNumeric } from "@/lib/timeZone";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";

/**
 * Confirmation that the person has agreed to have their data published on the site.
 *
 * The person gives the consent, not the administrator filling the form, so the
 * wording says it was received. The form keeps Save disabled until this is ticked;
 * the server action checks it again and records the date.
 */
export default function ConsentCheckbox({
  required,
  checked,
  onChange,
  givenAt,
}: {
  /** True while the person is shown on the site: only then is saving blocked without consent. */
  required: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** ISO date the consent was first recorded, or null while it has not been. */
  givenAt: string | null;
}) {
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-ocean mb-4">Согласие на публикацию</p>
      <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
        <input
          type="checkbox"
          name="consent"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
        />
        <span>Получено согласие этого человека на публикацию его данных (имя, фото, контакты) на сайте</span>
      </label>
      <p className="text-xs text-ocean/40 mt-2">
        {givenAt && checked
          ? `Согласие записано ${formatDateNumeric(givenAt)}. `
          : ""}
        {required
          ? "Пока человек показывается на сайте, без этой отметки сохранить нельзя. Дата отметки сохраняется как подтверждение."
          : "Человек скрыт с сайта, поэтому сохранить можно и без согласия. Если он отозвал согласие, снимите отметку: дата будет удалена."}
      </p>
    </div>
  );
}
