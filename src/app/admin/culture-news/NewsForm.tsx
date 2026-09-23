"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import { PUBLISH_STATUSES, PUBLISH_STATUS_LABELS } from "@/lib/publishStatus";
import { isoToDateTimeInput } from "@/lib/eventFields";
import type { CultureNewsRecord, NewsImage } from "@/lib/cultureNews";
import BilingualField from "@/components/admin/BilingualField";
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

/** Today at nine, so a new item starts with a sensible publication date. */
function defaultPublishedAt(): string {
  const now = new Date();
  now.setHours(9, 0, 0, 0);
  return isoToDateTimeInput(now.toISOString());
}

export default function NewsForm({
  item,
  organizationId,
  action,
  heading,
}: {
  item?: CultureNewsRecord;
  organizationId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [images, setImages] = useState<NewsImage[]>(item?.images ?? []);
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
    const added: NewsImage[] = [];

    for (const file of files) {
      const path = mediaPath(organizationId, "culture-news", file.name);
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
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/culture-news" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Заголовок и метка</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField kkName="title_kk" ruName="title_ru" label="Заголовок" defaultKk={item?.titleKk} defaultRu={item?.titleRu} />
          <BilingualField
            kkName="tag_kk"
            ruName="tag_ru"
            label="Метка"
            defaultKk={item?.tagKk}
            defaultRu={item?.tagRu}
            placeholderKk="например: Байқау"
            placeholderRu="например: Конкурс"
          />
        </div>
        <p className="text-xs text-ocean/40 mt-2">Метка — короткое слово на карточке: Конкурс, Кружок, Мероприятие.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Текст</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField
            kkName="excerpt_kk"
            ruName="excerpt_ru"
            label="Анонс"
            defaultKk={item?.excerptKk}
            defaultRu={item?.excerptRu}
            textarea
            rows={3}
          />
          <BilingualField
            kkName="content_kk"
            ruName="content_ru"
            label="Полный текст"
            defaultKk={item?.contentKk}
            defaultRu={item?.contentRu}
            textarea
            rows={9}
          />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Анонс показывается на карточке, полный текст — на странице новости. Абзацы разделяйте пустой строкой.
        </p>
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
        <p className="text-xs text-ocean/40 mt-2">JPEG, PNG, WebP или AVIF, до 5 МБ. Первая фотография — главная.</p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Публикация</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            name="published_at"
            label="Дата публикации"
            type="datetime-local"
            defaultValue={item ? isoToDateTimeInput(item.publishedAt) : defaultPublishedAt()}
          />
          <div>
            <label className={LABEL} htmlFor="status">
              Статус
            </label>
            <select id="status" name="status" defaultValue={item?.status ?? "draft"} className={INPUT}>
              {PUBLISH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PUBLISH_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-ocean/40 mt-1.5">
          На сайте показываются только опубликованные, новые сверху. Время указывается по Атырау (UTC+5).
        </p>

        {/* The address is derived from the title, so it is out of the way by default.
            A native <details> keeps it in the form and submitted either way. */}
        <details className="mt-4 border-t border-cream-dark pt-4">
          <summary className="text-sm font-medium text-ocean/70 cursor-pointer select-none hover:text-ocean">
            Дополнительно
          </summary>
          <div className="mt-3">
            <Field name="slug" label="Адрес страницы" defaultValue={item?.slug} placeholder="составится из заголовка" />
            <p className="text-xs text-ocean/40 mt-1.5">
              Часть ссылки на страницу новости: /news/&lt;адрес&gt;. Оставьте пустым — составится из заголовка.
              Менять стоит, только если нужна ссылка короче.
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
        <Link href="/admin/culture-news" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
