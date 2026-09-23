"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import type { CultureClubImage, CultureClubRecord } from "@/lib/cultureClubs";
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

/**
 * A numbered card header — same four groups every time (basics, media, contacts,
 * publishing), numbered so the form reads as a short sequence instead of a wall of
 * identical white cards.
 */
function SectionHeading({ index, title, hint }: { index: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="shrink-0 w-7 h-7 rounded-full bg-ocean/10 text-ocean text-sm font-bold grid place-items-center">
        {index}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-ocean">{title}</p>
        {hint && <p className="text-xs text-ocean/40 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export default function CollectiveForm({
  collective,
  organizationId,
  memberCount,
  action,
  heading,
}: {
  collective?: CultureClubRecord;
  organizationId: string;
  /** How many artists are attached; shown so the roster is not forgotten. */
  memberCount?: number;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [images, setImages] = useState<CultureClubImage[]>(collective?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Drives whether the year field is worth showing. Purely visual: the year is
  // stored either way, so switching the title off and on does not lose it.
  const [honored, setHonored] = useState(collective?.isHonored ?? false);

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
    const added: CultureClubImage[] = [];

    for (const file of files) {
      const path = mediaPath(organizationId, "culture-clubs", file.name);
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
      {collective && <input type="hidden" name="id" value={collective.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/culture-collectives" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <SectionHeading index={1} title="Основная информация" hint="Название, вид, руководитель и описание коллектива" />

        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField kkName="name_kk" ruName="name_ru" label="Название" defaultKk={collective?.nameKk} defaultRu={collective?.nameRu} />
          <BilingualField
            kkName="direction_kk"
            ruName="direction_ru"
            label="Вид коллектива"
            defaultKk={collective?.directionKk}
            defaultRu={collective?.directionRu}
            placeholderKk="Халықтық театр"
            placeholderRu="Народный театр"
          />
          <Field
            name="manager_name"
            label="Художественный руководитель"
            defaultValue={collective?.managerName}
            placeholder="Жиенбаева Назгүл Өмірғалиқызы"
          />
          <Field
            name="founded_year"
            label="Год основания"
            type="number"
            min={1800}
            max={2200}
            defaultValue={collective?.foundedYear?.toString()}
            placeholder="1957"
          />
        </div>

        <div className="border-t border-cream-dark mt-5 pt-5">
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
            <input
              type="checkbox"
              name="is_honored"
              checked={honored}
              onChange={(e) => setHonored(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
            />
            <span>
              Звание «Народный»
              <span className="block text-xs text-ocean/40">
                По этой галочке собирается страница «Коллективы со званием „Народный“». Год можно не указывать —
                звание при этом остаётся, просто на странице не будет строки с годом.
              </span>
            </span>
          </label>

          {honored && (
            <div className="mt-3 sm:w-1/2 sm:pr-2">
              <Field
                name="honored_since"
                label="Год присвоения звания"
                type="number"
                min={1800}
                max={2200}
                defaultValue={collective?.honoredSince?.toString()}
                placeholder="2008"
              />
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 border-t border-cream-dark mt-5 pt-5">
          <BilingualField
            kkName="description_kk"
            ruName="description_ru"
            label="Краткое описание"
            defaultKk={collective?.descriptionKk}
            defaultRu={collective?.descriptionRu}
            textarea
            rows={3}
          />
          <BilingualField
            kkName="full_text_kk"
            ruName="full_text_ru"
            label="Полное описание"
            defaultKk={collective?.fullTextKk}
            defaultRu={collective?.fullTextRu}
            textarea
            rows={8}
          />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Краткое описание показывается карточкой в списке коллективов, полное — на странице коллектива. Абзацы
          разделяйте пустой строкой.
        </p>
      </div>

      <div className={CARD}>
        <SectionHeading index={2} title="Медиа" hint="Фотографии для карточки и страницы коллектива" />

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="relative aspect-video rounded-2xl overflow-hidden border border-cream-dark"
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
          JPEG, PNG, WebP или AVIF, до 5 МБ. Первая фотография — главная, она идёт на карточку и на страницу
          коллектива.
        </p>
      </div>

      <div className={CARD}>
        <SectionHeading index={3} title="Контакты" hint="Как связаться с коллективом" />
        <div className="sm:w-1/2 sm:pr-2">
          <Field
            name="contact_phone"
            label="Телефон"
            defaultValue={collective?.contactPhone}
            placeholder="+7 778 927 63 87"
          />
        </div>
      </div>

      <div className={CARD}>
        <SectionHeading index={4} title="Публикация" hint="Виден ли коллектив на сайте и по какому адресу" />

        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={collective?.isActive ?? true}
            className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
          />
          <span>Показывать на сайте</span>
        </label>

        {memberCount !== undefined && memberCount > 0 && (
          <p className="text-xs text-ocean/40 mt-3">
            В коллективе {memberCount}{" "}
            {memberCount === 1 ? "артист" : memberCount < 5 ? "артиста" : "артистов"} — состав редактируется в
            разделе «Состав ансамбля». Если снять галочку, коллектив исчезнет с сайта вместе со своим составом.
          </p>
        )}

        {/* The address is derived from the name, so it is out of the way by default.
            A native <details> keeps it in the form and submitted either way. */}
        <details className="mt-4 border-t border-cream-dark pt-4">
          <summary className="text-sm font-medium text-ocean/70 cursor-pointer select-none hover:text-ocean">
            Дополнительно
          </summary>
          <div className="mt-3">
            <Field
              name="slug"
              label="Адрес страницы"
              defaultValue={collective?.slug}
              placeholder="составится из названия"
            />
            <p className="text-xs text-ocean/40 mt-1.5">
              Часть ссылки: /collectives/&lt;адрес&gt;. Менять уже опубликованный адрес не стоит — разосланные
              ссылки и напечатанные QR-коды перестанут открываться.
            </p>
          </div>
        </details>
      </div>

      {/* Sticky rather than a plain row at the end: on a form this long, Save should
          never be more than a scroll-glance away. */}
      <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-cream/95 backdrop-blur border-t border-cream-dark flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/culture-collectives" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
