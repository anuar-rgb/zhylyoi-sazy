"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import type { CultureStaffRecord, StaffImage } from "@/lib/cultureStaff";
import TranslateAllButton from "@/components/admin/TranslateAllButton";
import type { FormState } from "./actions";

const TRANSLATE_PAIRS = [
  { kk: "name_kk", ru: "name_ru" },
  { kk: "role_kk", ru: "role_ru" },
  { kk: "description_kk", ru: "description_ru" },
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

export default function StaffForm({
  person,
  organizationId,
  action,
  heading,
}: {
  person?: CultureStaffRecord;
  organizationId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [images, setImages] = useState<StaffImage[]>(person?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * The photo goes straight from the browser to Storage rather than through the
   * server action: the session cookie carries the identity, the Storage policy
   * checks the folder, and a five-megabyte photo never has to fit in a form
   * submission.
   */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const added: StaffImage[] = [];

    for (const file of files) {
      const path = mediaPath(organizationId, "culture-staff", file.name);
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

  /** Removes the photo from the form only; the file goes when the form is saved. */
  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-5">
      {person && <input type="hidden" name="id" value={person.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <div className="flex items-center gap-4">
          <TranslateAllButton pairs={TRANSLATE_PAIRS} />
          <Link href="/admin/culture-staff" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
            Отмена
          </Link>
        </div>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Имя и должность</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="name_kk" label="ФИО (kk)" defaultValue={person?.nameKk} />
          <Field name="name_ru" label="ФИО (ru)" defaultValue={person?.nameRu} />
          <Field name="role_kk" label="Должность (kk)" defaultValue={person?.roleKk} placeholder="Басшысы" />
          <Field name="role_ru" label="Должность (ru)" defaultValue={person?.roleRu} placeholder="Директор" />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          ФИО достаточно ввести на одном языке — второй подставится. Должность стоит заполнить на обоих: она
          переводится.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Фотография</p>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="relative aspect-square rounded-2xl overflow-hidden border border-cream-dark"
              >
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
        <p className="text-xs text-ocean/40 mt-2">
          JPEG, PNG, WebP или AVIF, до 5 МБ. Первая фотография показывается на карточке. Без фотографии карточка
          покажет инициалы.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Дополнительно</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field name="description_kk" label="Описание (kk)" defaultValue={person?.descriptionKk} textarea rows={3} />
          <Field name="description_ru" label="Описание (ru)" defaultValue={person?.descriptionRu} textarea rows={3} />
          <Field name="phone" label="Телефон" defaultValue={person?.phone} placeholder="+7 778 927 63 87" />
          <Field name="email" label="Электронная почта" defaultValue={person?.email} type="email" />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Описание — короткая справка под должностью: образование, стаж, направление работы. Телефон и почта
          показываются на карточке; оставьте пустыми, если их публиковать не нужно.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Показ на сайте</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            name="sort_order"
            label="Порядок в списке"
            type="number"
            defaultValue={String(person?.sortOrder ?? 0)}
          />
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer sm:mt-8">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={person?.isActive ?? true}
              className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
            />
            <span>Показывать на сайте</span>
          </label>
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Меньше число — выше в списке: у руководителя поставьте 0, у остальных 10, 20 и так далее. Так между ними
          останется место, чтобы вставить нового человека, не переписывая всех. Одинаковые числа разбираются по
          имени.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/culture-staff" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
