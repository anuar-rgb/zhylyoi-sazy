"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";

/**
 * One picture of the institution's card (the logo, the link preview picture): shown, replaced by an
 * upload, or removed. The file goes from the browser straight to Storage, into the institution's own
 * folder, as the other admin photos do; the form saves only its address (hidden input `name`).
 */
export default function ImageField({
  name,
  label,
  hint,
  organizationId,
  defaultValue,
  round = false,
}: {
  name: string;
  label: string;
  hint: string;
  organizationId: string;
  defaultValue: string | null;
  round?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = mediaPath(organizationId, "organizations", file.name);
    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
    if (uploadError) setError(`Не удалось загрузить: ${uploadError.message}`);
    else setUrl(supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <p className="block text-sm font-medium text-ocean/70 mb-1.5">{label}</p>
      <input type="hidden" name={name} value={url ?? ""} />
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`relative w-20 h-20 shrink-0 overflow-hidden bg-cream border border-cream-dark ${round ? "rounded-full" : "rounded-2xl"}`}
        >
          {url ? (
            <Image src={url} alt={label} fill sizes="80px" className={round ? "object-cover" : "object-contain"} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-ocean/40">нет</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50">
            {uploading ? "Загрузка…" : url ? "Заменить" : "Загрузить"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload} disabled={uploading} />
          </label>
          {url && (
            <button
              type="button"
              onClick={() => setUrl(null)}
              className="px-4 py-2 rounded-full text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Убрать
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-ocean/40 mt-2">{hint}</p>
    </div>
  );
}
