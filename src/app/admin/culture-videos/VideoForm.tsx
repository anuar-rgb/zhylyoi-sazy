"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { youtubeId, youtubeThumbnailUrl, youtubeWatchUrl } from "@/lib/youtube";
import type { CultureVideoRecord } from "@/lib/cultureVideos";
import TranslateAllButton from "@/components/admin/TranslateAllButton";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const TRANSLATE_PAIRS = [
  { kk: "title_kk", ru: "title_ru" },
  { kk: "description_kk", ru: "description_ru" },
  { kk: "venue_kk", ru: "venue_ru" },
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
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  textarea?: boolean;
  // Omitted because it is declared above with a wider type: the record fields are
  // nullable, and an input's own defaultValue is not.
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

export default function VideoForm({
  video,
  action,
  heading,
}: {
  video?: CultureVideoRecord;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  // Prefilled with a full link rather than the stored eleven characters: the person
  // pasted a link, and a link is what they will recognise when they come back.
  const [link, setLink] = useState(video?.youtubeId ? youtubeWatchUrl(video.youtubeId) : "");

  const isFile = video?.kind === "file";
  // Checked as you type, so a wrong link is caught before saving rather than after.
  const parsed = link.trim() ? youtubeId(link) : null;

  return (
    <form action={formAction} className="space-y-5">
      {video && <input type="hidden" name="id" value={video.id} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <div className="flex items-center gap-4">
          <TranslateAllButton pairs={TRANSLATE_PAIRS} />
          <Link href="/admin/culture-videos" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
            Отмена
          </Link>
        </div>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Ссылка на видео</p>

        {isFile ? (
          <div className="bg-cream/40 border border-cream-dark rounded-2xl px-4 py-3">
            <p className="text-sm text-ocean/70">
              Эта запись — файл внутри сайта: <span className="font-mono text-xs">{video?.filePath}</span>
            </p>
            <p className="text-xs text-ocean/40 mt-1.5">
              Заменить файл из панели нельзя. Выложите запись на YouTube, добавьте её здесь как новую и удалите
              эту — так видео перестанет занимать место в самом сайте.
            </p>
          </div>
        ) : (
          <>
            <label className={LABEL} htmlFor="youtube_url">
              Адрес на YouTube
            </label>
            <input
              id="youtube_url"
              name="youtube_url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={INPUT}
            />

            {parsed ? (
              <div className="flex items-start gap-3 mt-3">
                {/* Plain img, not next/image: this is a preview of somebody else's
                    thumbnail in the panel, not a page image worth optimising. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumbnailUrl(parsed)}
                  alt=""
                  className="w-32 rounded-xl border border-cream-dark"
                />
                <p className="text-xs text-ocean/50">
                  Видео найдено. Если на картинке не то, что нужно, проверьте ссылку.
                </p>
              </div>
            ) : (
              link.trim() && (
                <p className="text-xs text-red-600 mt-2">
                  Ссылка не распознана. Скопируйте адрес из строки браузера или кнопкой «Поделиться».
                </p>
              )
            )}

            <p className="text-xs text-ocean/40 mt-2">
              Подойдёт любая форма: адрес из строки браузера, короткая ссылка youtu.be, ссылка с меткой времени.
              Видео на YouTube должно быть доступно по ссылке — не «Ограниченный доступ».
            </p>
          </>
        )}
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Подписи</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BilingualField kkName="title_kk" ruName="title_ru" label="Название" defaultKk={video?.titleKk} defaultRu={video?.titleRu} />
          <BilingualField
            kkName="description_kk"
            ruName="description_ru"
            label="Описание"
            defaultKk={video?.descriptionKk}
            defaultRu={video?.descriptionRu}
            textarea
          />
          <BilingualField
            kkName="venue_kk"
            ruName="venue_ru"
            label="Место и год"
            defaultKk={video?.venueKk}
            defaultRu={video?.venueRu}
            placeholderKk="«Кең Жылыой» мәдениет үйі, 2026 жыл"
            placeholderRu="Дом культуры «Кен Жылыой», 2026 год"
          />
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Название и место показываются поверх видео до нажатия, описание — под ним.
        </p>
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-4">Показ на сайте</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            name="sort_order"
            label="Порядок в списке"
            type="number"
            defaultValue={String(video?.sortOrder ?? 0)}
          />
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer sm:mt-8">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={video?.isActive ?? true}
              className="mt-0.5 w-4 h-4 accent-ocean shrink-0"
            />
            <span>Показывать на сайте</span>
          </label>
        </div>
        <p className="text-xs text-ocean/40 mt-2">Меньше число — выше в списке. Шаг в десять оставляет место между записями.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/culture-videos" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
