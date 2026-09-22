"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markApplication } from "../actions";
import type { ApplicationStatus } from "@/lib/applications";

export default function MarkProcessedButton({
  id,
  status,
}: {
  id: string;
  status: ApplicationStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processed = status !== "new";
  const next: ApplicationStatus = processed ? "new" : "completed";

  async function handleClick() {
    setBusy(true);
    setError(null);

    const result = await markApplication(id, next);
    setBusy(false);

    // An update the caller has no rights for changes zero rows without erroring,
    // so without this the badge would stay put and look like a glitch.
    if (result.ok) router.refresh();
    else setError("Не удалось сохранить.");
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={
          processed
            ? "text-xs font-semibold text-ocean/40 hover:text-ocean transition-colors disabled:opacity-50"
            : "text-xs font-semibold text-ocean hover:text-gold-dark transition-colors disabled:opacity-50"
        }
      >
        {busy ? "…" : processed ? "Вернуть в новые" : "Обработана"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
