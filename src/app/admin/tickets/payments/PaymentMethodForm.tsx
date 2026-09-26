"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, mediaPath } from "@/lib/storage";
import type { PaymentMethodRecord, PaymentProviderRecord } from "@/lib/paymentMethods";
import BilingualField from "@/components/admin/BilingualField";
import type { FormState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
const MAX_QR_BYTES = 2 * 1024 * 1024;

export default function PaymentMethodForm({
  method,
  providers,
  organizationId,
  action,
  heading,
}: {
  /** Editing an existing method. Absent on the "add" form. */
  method?: PaymentMethodRecord;
  /** On the "add" form: providers not yet used by this organization. On edit: just the current one, locked. */
  providers: PaymentProviderRecord[];
  organizationId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  heading: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [qrImage, setQrImage] = useState<{ url: string; path: string } | null>(
    method?.staticQrImageUrl && method.staticQrImagePath
      ? { url: method.staticQrImageUrl, path: method.staticQrImagePath }
      : null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_QR_BYTES) {
      setUploadError("Файл больше 2 МБ.");
      event.target.value = "";
      return;
    }
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setUploadError("Только JPEG или PNG.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setUploadError(null);

    const path = mediaPath(organizationId, "payments", file.name);
    const supabase = createClient();
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });

    if (error) {
      setUploadError(`Не удалось загрузить: ${error.message}`);
      setUploading(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    setQrImage({ url: data.publicUrl, path });
    setUploading(false);
    event.target.value = "";
  }

  return (
    <form action={formAction} className="space-y-5">
      {method && <input type="hidden" name="id" value={method.id} />}
      <input type="hidden" name="qr_image" value={qrImage ? JSON.stringify(qrImage) : ""} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{heading}</h1>
        <Link href="/admin/tickets/payments" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>

      {state.error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
      )}

      <div className={CARD}>
        <div className="mb-5">
          <label className={LABEL} htmlFor="provider_code">
            Провайдер
          </label>
          {method ? (
            <p className="text-sm font-semibold text-ocean">{method.providerName}</p>
          ) : (
            <select id="provider_code" name="provider_code" required className={INPUT} defaultValue="">
              <option value="" disabled>
                Выберите провайдера
              </option>
              {providers.map((provider) => (
                <option key={provider.code} value={provider.code}>
                  {provider.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <BilingualField
          kkName="display_name_kk"
          ruName="display_name_ru"
          label="Название для зрителя"
          defaultKk={method?.displayNameKk}
          defaultRu={method?.displayNameRu}
          placeholderKk="Kaspi арқылы төлеу"
          placeholderRu="Оплата через Kaspi"
        />
        <p className="text-xs text-ocean/40 mt-1.5">Необязательно — если не заполнить, покажется название провайдера.</p>

        {!method && (
          <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer mt-5 pt-5 border-t border-cream-dark">
            <input type="checkbox" name="is_default" className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
            <span>Использовать по умолчанию</span>
          </label>
        )}
      </div>

      <div className={CARD}>
        <p className="text-sm font-semibold text-ocean mb-1">QR-код</p>
        <p className="text-xs text-ocean/40 mb-4">Статичный QR для оплаты — до 2 МБ, JPEG или PNG.</p>

        {qrImage && (
          <div className="relative w-40 h-40 mb-4 rounded-2xl overflow-hidden border border-cream-dark">
            <Image src={qrImage.url} alt="QR-код оплаты" fill className="object-contain bg-white" />
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm text-ocean/70"
        />
        {uploading && <p className="text-xs text-ocean/50 mt-2">Загрузка…</p>}
        {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin/tickets/payments" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          Отмена
        </Link>
      </div>
    </form>
  );
}
