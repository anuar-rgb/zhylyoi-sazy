"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePiece } from "./actions";

export default function DeletePieceButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Удалить произведение «${title}»? Карточка исчезнет с сайта.`)) return;
    setBusy(true);
    setError(null);

    const result = await deletePiece(id);
    setBusy(false);

    // A delete the caller has no rights for removes zero rows without erroring,
    // so without this the row would stay put and look like a glitch.
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
