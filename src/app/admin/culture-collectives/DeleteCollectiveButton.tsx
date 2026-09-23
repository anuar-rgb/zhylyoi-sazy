"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCollective } from "./actions";

export default function DeleteCollectiveButton({
  id,
  name,
  memberCount,
}: {
  id: string;
  name: string;
  /** Warned about explicitly: the artists survive, and that is not obvious. */
  memberCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const about =
      memberCount > 0
        ? `\n\nАртисты (${memberCount}) не удалятся — они останутся в разделе «Состав ансамбля» без коллектива, и их можно будет приписать к другому.`
        : "";

    if (!confirm(`Удалить коллектив «${name}»? Его страница исчезнет с сайта.${about}`)) return;

    setBusy(true);
    setError(null);

    const result = await deleteCollective(id);
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
