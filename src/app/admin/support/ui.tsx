"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import {
  SUPPORT_BODY_MAX,
  SUPPORT_IMAGE_MAX_BYTES,
  SUPPORT_IMAGE_TYPES,
  SUPPORT_MAX_IMAGES,
  SUPPORT_SUBJECT_MAX,
} from "@/lib/supportRules";
import {
  closeSupportRequestAction,
  createSupportRequestAction,
  deleteSupportRequestAction,
  sendSupportMessageAction,
  supportPickerDiagAction,
  supportUploadSlotsAction,
} from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/** Long side of a screenshot after shrinking: still readable, a fraction of the phone's original. */
const MAX_SIDE = 1600;

/**
 * Shrinks a picture before upload so screenshots take little room on the server. Falls back to the
 * original file when the browser cannot decode it; the bucket still checks type and size.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Uploads the chosen pictures through server-issued slots and returns their storage paths. */
async function uploadImages(files: File[], requestId?: string): Promise<{ ok: true; paths: string[] } | { ok: false; message: string }> {
  if (!files.length) return { ok: true, paths: [] };
  const blobs = await Promise.all(files.map(shrink));
  for (const b of blobs) {
    if (!(SUPPORT_IMAGE_TYPES as readonly string[]).includes(b.type)) return { ok: false, message: "Картинка должна быть JPG, PNG или WEBP." };
    if (b.size > SUPPORT_IMAGE_MAX_BYTES) return { ok: false, message: "Картинка больше 5 МБ." };
  }
  const slots = await supportUploadSlotsAction(
    blobs.map((b) => b.type),
    requestId
  );
  if (!slots.ok) return slots;
  const storage = createClient().storage.from("support-files");
  for (let i = 0; i < blobs.length; i++) {
    const { error } = await storage.uploadToSignedUrl(slots.value[i].path, slots.value[i].token, blobs[i], { contentType: blobs[i].type });
    if (error) return { ok: false, message: "Картинка не загрузилась. Попробуйте ещё раз." };
  }
  return { ok: true, paths: slots.value.map((s) => s.path) };
}

/** A small preview of a chosen picture; the object URL is released when it goes. */
function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    if (img.current) img.current.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <li className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} alt={file.name} className="h-20 w-20 rounded-xl border border-cream-dark object-cover bg-cream/40" />
      <button
        type="button"
        aria-label={`Убрать ${file.name}`}
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-cream-dark text-ocean/70 shadow-sm text-base leading-none"
      >
        ×
      </button>
    </li>
  );
}

/**
 * The file field sits inside its label rather than hidden and clicked from code: a tap on the label
 * opens the phone's picker natively. It is always in the page (only the label hides at the limit),
 * so the native listeners below stay attached.
 */
function ImagePicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // The latest list and setter, for the native listeners (attached once).
  const latest = useRef({ files, onChange });
  useEffect(() => {
    latest.current = { files, onChange };
  });

  // Listened to natively on both `change` and `input`: some phone browsers report a pick with only
  // one of them. Desktop browsers send both for one pick, so a pick already taken is skipped.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    let lastPick = "";
    const take = (event: Event) => {
      const picked = Array.from(el.files ?? []);
      void supportPickerDiagAction({
        event: event.type,
        count: picked.length,
        files: picked.map((f) => ({ type: f.type, size: f.size })),
        ua: navigator.userAgent,
      }).catch(() => {});
      if (!picked.length) return;
      const signature = picked.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|");
      if (signature === lastPick) return;
      lastPick = signature;
      const { files: current, onChange: set } = latest.current;
      set([...current, ...picked].slice(0, SUPPORT_MAX_IMAGES));
      // Emptied after both events of this pick, so the same photo can be chosen again later.
      window.setTimeout(() => {
        el.value = "";
        lastPick = "";
      }, 500);
    };
    el.addEventListener("change", take);
    el.addEventListener("input", take);
    return () => {
      el.removeEventListener("change", take);
      el.removeEventListener("input", take);
    };
  }, []);

  const full = files.length >= SUPPORT_MAX_IMAGES;
  return (
    <div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3 mb-3 pt-2">
          {files.map((f, i) => (
            <Thumb key={`${f.name}-${f.size}-${i}`} file={f} onRemove={() => onChange(files.filter((_, j) => j !== i))} />
          ))}
        </ul>
      )}
      <label
        htmlFor={id}
        className={`${full ? "hidden" : "inline-block"} cursor-pointer px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50 focus-within:ring-2 focus-within:ring-gold`}
      >
        Прикрепить скриншот
        <input ref={input} id={id} type="file" accept="image/*" className="sr-only" disabled={full} />
      </label>
      <p className="text-xs text-ocean/50 mt-1.5">
        {files.length ? `Выбрано: ${files.length} из ${SUPPORT_MAX_IMAGES}.` : `До ${SUPPORT_MAX_IMAGES} картинок, по одной.`} Мы
        уменьшим их перед отправкой.
      </p>
    </div>
  );
}

/**
 * Keeps a support page current without a manual reload: re-reads it from the server every few
 * seconds while the tab is visible, and at once when the person comes back to it. A refresh keeps
 * what is being typed in the forms.
 */
export function LiveRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}

/** The institution's new request: subject, text, screenshots. */
export function NewRequestForm() {
  const router = useRouter();
  const feedback = useFeedback();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const uploaded = await uploadImages(files);
    if (!uploaded.ok) {
      setBusy(false);
      setError(uploaded.message);
      return;
    }
    const result = await createSupportRequestAction({ subject, body, images: uploaded.paths });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    feedback.success("Обращение отправлено");
    router.push(`/admin/support/${result.value}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="support-subject" className={LABEL}>
          Тема
        </label>
        <input
          id="support-subject"
          className={INPUT}
          value={subject}
          maxLength={SUPPORT_SUBJECT_MAX}
          required
          placeholder="Например: не загружается афиша"
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="support-body" className={LABEL}>
          Сообщение
        </label>
        <textarea
          id="support-body"
          className={`${INPUT} min-h-32`}
          value={body}
          maxLength={SUPPORT_BODY_MAX}
          required
          placeholder="Что случилось и на какой странице"
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <ImagePicker files={files} onChange={setFiles} />
      {error && <p role="alert" className="text-sm rounded-2xl px-4 py-3 bg-red-50 border border-red-200 text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}

/** A reply inside a request, from either side. */
export function ReplyForm({ requestId, closed }: { requestId: string; closed: boolean }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const uploaded = await uploadImages(files, requestId);
    if (!uploaded.ok) {
      setBusy(false);
      setError(uploaded.message);
      return;
    }
    const result = await sendSupportMessageAction(requestId, { body, images: uploaded.paths });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBody("");
    setFiles([]);
    feedback.success("Сообщение отправлено");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="support-reply" className={LABEL}>
        {closed ? "Обращение закрыто. Новое сообщение откроет его снова." : "Ваше сообщение"}
      </label>
      <textarea
        id="support-reply"
        className={`${INPUT} min-h-28`}
        value={body}
        maxLength={SUPPORT_BODY_MAX}
        required
        onChange={(e) => setBody(e.target.value)}
      />
      <ImagePicker files={files} onChange={setFiles} />
      {error && <p role="alert" className="text-sm rounded-2xl px-4 py-3 bg-red-50 border border-red-200 text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
        {busy ? "Отправляем…" : "Отправить"}
      </button>
    </form>
  );
}

/** The platform owner's buttons on a request: close it, or delete it with its pictures. */
export function PlatformRequestButtons({ requestId, closed }: { requestId: string; closed: boolean }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function close() {
    setBusy(true);
    const result = await closeSupportRequestAction(requestId);
    setBusy(false);
    if (result.ok) {
      feedback.success("Обращение закрыто");
      router.refresh();
    } else feedback.error(result.message);
  }

  async function remove() {
    const confirmed = await feedback.confirm({
      title: "Удалить обращение навсегда?",
      message: "Удалится вся переписка и все картинки. Вернуть будет нельзя.",
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    const result = await deleteSupportRequestAction(requestId);
    setBusy(false);
    if (result.ok) {
      feedback.success("Обращение удалено");
      router.push("/admin/platform/support");
    } else feedback.error(result.message);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!closed && (
        <button
          type="button"
          disabled={busy}
          onClick={close}
          className="px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50 disabled:opacity-50"
        >
          Закрыть обращение
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="px-4 py-2 rounded-full border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Удалить
      </button>
    </div>
  );
}
