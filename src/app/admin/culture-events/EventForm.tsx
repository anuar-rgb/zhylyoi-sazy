"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  isoToDateTimeInput,
} from "@/lib/eventFields";
import type { CultureEventRecord, EventImage } from "@/lib/cultureEvents";
import TranslateRow from "@/components/admin/TranslateRow";
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
  rows = 4,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  textarea?: boolean;
  rows?: number;
  // Omitted because they are declared above with a wider type: the record fields
  // are nullable, and an input's own defaultValue is not.
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">) {
  return (
    <div>
      <label className={LABEL} htmlFor={name}>
        {label}
      </label>
      {textarea ? (
        <textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} className={`${INPUT} resize-y`} />
      ) : (
        <input id={name} name={name} defaultValue={defaultValue ?? ""} className={INPUT} {...rest} />
      )}
    </div>
  );
}

export default function EventForm({
  event,
  organizationId,
  action,
  heading,
}: {
  event?: CultureEventRecord;
  organizationId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [images, setImages] = useState<EventImage[]>(event?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Files go straight from the browser to Storage rather than through the server
   * action: the session cookie carries the identity, the Storage policy checks the
   * folder, and a five-megabyte photo never has to fit in a form submission.
   */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const added: EventImage[] = [];

    for (const file of files) {
      const path = mediaPath(organizationId, "culture-events", file.name);
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
      if (error) {
        setUploadError(`Не удалось загрузить «${file.name}»: ${error.message}`);
        break;
      }
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      added.push({ url: data.publicUrl, path });
    }

    if (added.length > 0) setImages((current) => [...current, ...added]);
    setUploading(false);
    e.target.value = "";
  }

  /** Removes the image from the form only; the file goes when the form is saved. */
  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-5">
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/culture-events" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Название</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="title_kk" label="Название (kk)" defaultValue={event?.titleKk} />
          <Field name="title_ru" label="Название (ru)" defaultValue={event?.titleRu} />
        </div>
          <TranslateRow kk="title_kk" ru="title_ru" className="sm:col-span-2 -mt-1" />
        <p className="text-xs text-ocean/40 mt-2">Достаточно одного языка — второй подставится автоматически.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Когда и где</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            name="event_date"
            label="Начало"
            type="datetime-local"
            required
            defaultValue={isoToDateTimeInput(event?.eventDate ?? null)}
          />
          <Field
            name="end_date"
            label="Окончание (необязательно)"
            type="datetime-local"
            defaultValue={isoToDateTimeInput(event?.endDate ?? null)}
          />
          <Field name="location_kk" label="Место (kk)" defaultValue={event?.locationKk} />
          <Field name="location_ru" label="Место (ru)" defaultValue={event?.locationRu} />
          <Field name="organizer_kk" label="Организатор (kk)" defaultValue={event?.organizerKk} />
          <Field name="organizer_ru" label="Организатор (ru)" defaultValue={event?.organizerRu} />
          <Field name="age_limit" label="Возрастное ограничение" defaultValue={event?.ageLimit} placeholder="например: 6+" />
        </div>
        <p className="text-xs text-ocean/40 mt-2">Время указывается по Атырау (UTC+5).</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Категории</p>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex items-center gap-2 text-sm text-ocean/70 bg-cream/40 border border-cream-dark rounded-full px-3.5 py-2 cursor-pointer hover:bg-cream/70"
            >
              <input
                type="checkbox"
                name="categories"
                value={category}
                defaultChecked={event?.categories.includes(category)}
                className="w-4 h-4 accent-ocean"
              />
              <span>{EVENT_CATEGORY_LABELS[category]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ocean/40 mt-2.5">По ним посетитель фильтрует афишу. Можно выбрать несколько.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Описание</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="description_kk" label="Краткое описание (kk)" defaultValue={event?.descriptionKk} textarea rows={3} />
          <Field name="description_ru" label="Краткое описание (ru)" defaultValue={event?.descriptionRu} textarea rows={3} />
          <TranslateRow kk="description_kk" ru="description_ru" className="sm:col-span-2 -mt-1" />
          <Field name="full_text_kk" label="Полное описание (kk)" defaultValue={event?.fullTextKk} textarea rows={7} />
          <Field name="full_text_ru" label="Полное описание (ru)" defaultValue={event?.fullTextRu} textarea rows={7} />
        </div>
        <TranslateRow kk="full_text_kk" ru="full_text_ru" className="mt-2" />
        <p className="text-xs text-ocean/40 mt-2">Абзацы разделяйте пустой строкой.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Фотографии</p>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {images.map((image, index) => (
              <div key={image.url} className="relative aspect-square rounded-2xl overflow-hidden border border-cream-dark">
                <Image src={image.url} alt="" fill className="object-cover" sizes="180px" unoptimized />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 bg-white/90 text-red-600 text-xs font-semibold rounded-full px-2 py-1 hover:bg-white"
                >
                  Убрать
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm text-ocean/70 file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-cream file:text-ocean file:text-sm file:font-semibold"
        />
        {uploading && <p className="text-xs text-ocean/50 mt-2">Загрузка…</p>}
        {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
        <p className="text-xs text-ocean/40 mt-2">JPEG, PNG, WebP или AVIF, до 5 МБ. Первая фотография — афиша.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Публикация</p>
        <div>
          <label className={LABEL} htmlFor="status">
            Статус
          </label>
          <select id="status" name="status" defaultValue={event?.status ?? "draft"} className={INPUT}>
            {EVENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EVENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ocean/40 mt-1.5">На сайте показываются только опубликованные.</p>

        {/* The address is derived from the title, so it is out of the way by default.
            A native <details> keeps it in the form and submitted either way. */}
        <details className="mt-4 border-t border-cream-dark pt-4">
          <summary className="text-sm font-medium text-ocean/70 cursor-pointer select-none hover:text-ocean">
            Дополнительно
          </summary>
          <div className="mt-3">
            <Field name="slug" label="Адрес страницы" defaultValue={event?.slug} placeholder="составится из названия" />
            <p className="text-xs text-ocean/40 mt-1.5">
              Часть ссылки на страницу мероприятия: /afisha/&lt;адрес&gt;. Оставьте пустым — составится из
              названия. Менять стоит, только если нужна ссылка короче.
            </p>
          </div>
        </details>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/culture-events" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
