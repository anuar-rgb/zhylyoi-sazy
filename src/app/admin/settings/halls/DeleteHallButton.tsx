"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteHall } from "./actions";

export default function DeleteHallButton({
  id,
  name,
  seatCount,
}: {
  id: string;
  name: string;
  /** Warned about explicitly: deleting the hall deletes its seats too, unlike a collective and its roster. */
  seatCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const about = seatCount > 0 ? `\n\nВместе с залом удалятся все его места (${seatCount}).` : "";
    if (!confirm(`Удалить зал «${name}»?${about}`)) return;

    setBusy(true);
    setError(null);

    const result = await deleteHall(id);
    setBusy(false);

    if (result.ok) router.refresh();
    else setError(result.error ?? "Не удалось удалить.");
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-xs font-semibold text-ocean/40 hover:text-red-600 transition-colors disabled:opacity-50"
      >
        Удалить
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[180px]">{error}</p>}
    </div>
  );
}
