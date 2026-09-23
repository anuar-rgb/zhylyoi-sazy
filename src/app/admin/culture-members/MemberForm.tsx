"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import type { CultureMemberRecord, MemberImage } from "@/lib/cultureMembers";
import TranslateAllButton from "@/components/admin/TranslateAllButton";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const TRANSLATE_PAIRS = [
  { kk: "name_kk", ru: "name_ru" },
  { kk: "role_kk", ru: "role_ru" },
  { kk: "education_kk", ru: "education_ru" },
  { kk: "specialty_kk", ru: "specialty_ru" },
  { kk: "level_kk", ru: "level_ru" },
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
  textarea,
  rows = 3,
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

export default function MemberForm({
  member,
  organizationId,
  collectives,
  defaultClubId,
  returnTo,
  action,
  heading,
}: {
  member?: CultureMemberRecord;
  organizationId: string;
  /** The institution's collectives, for the picker. Passed in so the form stays client-side. */
  collectives: { id: string; name: string }[];
  /** Preselected when adding from inside a collective. */
  defaultClubId?: string;
  /** Where to go after saving, when the form was opened from a collective. */
  returnTo?: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [images, setImages] = useState<MemberImage[]>(member?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * The portrait goes straight from the browser to Storage rather than through the
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
    const added: MemberImage[] = [];

    for (const file of files) {
      const path = mediaPath(organizationId, "culture-members", file.name);
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
      {member && <input type="hidden" name="id" value={member.id} />}
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <div className="flex items-center gap-4">
          <TranslateAllButton pairs={TRANSLATE_PAIRS} />
          <Link href={returnTo ?? "/admin/culture-members"} className="text-sm font-semibold text-ocean/60 hover:text-ocean">
            Отмена
          </Link>
        </div>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Коллектив</p>
        <select id="club_id" name="club_id" defaultValue={member?.clubId ?? defaultClubId ?? ""} className={INPUT}>
          <option value="">Без коллектива</option>
          {collectives.map((collective) => (
            <option key={collective.id} value={collective.id}>
              {collective.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-ocean/40 mt-2">
          В каком коллективе состоит артист. От этого зависит, в чьём составе он покажется на сайте. «Без
          коллектива» — останется в общем списке учреждения.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Имя и должность</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField kkName="name_kk" ruName="name_ru" label="ФИО" defaultKk={member?.nameKk} defaultRu={member?.nameRu} />
          <BilingualField
            kkName="role_kk"
            ruName="role_ru"
            label="Должность"
            defaultKk={member?.roleKk}
            defaultRu={member?.roleRu}
            placeholderKk="Домбыра әртісі"
            placeholderRu="Артист домбры"
          />
        </div>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Портрет</p>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-cream-dark"
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
          JPEG, PNG, WebP или AVIF, до 5 МБ. Карточка вытянута по вертикали, так что лучше подойдёт портретный
          снимок. Без фотографии покажется первая буква имени.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Образование</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField
            kkName="education_kk"
            ruName="education_ru"
            label="Учебное заведение"
            defaultKk={member?.educationKk}
            defaultRu={member?.educationRu}
            textarea
          />
          <BilingualField
            kkName="specialty_kk"
            ruName="specialty_ru"
            label="Специальность"
            defaultKk={member?.specialtyKk}
            defaultRu={member?.specialtyRu}
            textarea
          />
          <BilingualField
            kkName="level_kk"
            ruName="level_ru"
            label="Уровень"
            defaultKk={member?.levelKk}
            defaultRu={member?.levelRu}
            placeholderKk="жоғары"
            placeholderRu="высшее"
          />
          <BilingualField
            kkName="note_kk"
            ruName="note_ru"
            label="Звания и регалии"
            defaultKk={member?.noteKk}
            defaultRu={member?.noteRu}
            placeholderKk="Мәдениет саласының үздігі"
            placeholderRu="Отличник сферы культуры"
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-4">
          <input
            type="checkbox"
            name="has_higher_education"
            defaultChecked={member?.hasHigherEducation ?? false}
            className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
          />
          <span>
            Высшее образование
            <span className="block text-xs text-ocean/40">
              Отмечает значок на карточке золотым. Отдельная галочка, а не сравнение текста выше: иначе опечатка
              или заглавная буква молча меняли бы цвет.
            </span>
          </span>
        </label>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Показ на сайте</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            name="sort_order"
            label="Порядок в списке"
            type="number"
            defaultValue={String(member?.sortOrder ?? 0)}
          />
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer sm:mt-8">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={member?.isActive ?? true}
              className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
            />
            <span>Показывать на сайте</span>
          </label>
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Меньше число — выше в списке. У перенесённых артистов стоят 10, 20, 30 и так далее, чтобы вставить
          нового между ними, не переписывая остальных. Одинаковые числа разбираются по имени.
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
        <Link href={returnTo ?? "/admin/culture-members"} className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
