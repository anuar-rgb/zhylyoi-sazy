"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "./actions";

export default function DeleteEventButton({
  id,
  title,
  redirectHref,
}: {
  id: string;
  title: string;
  /** From the event editor: nowhere left on this page once it's gone, so navigate away instead of refreshing in place. Omitted on a list, which just refreshes without the deleted row. */
  redirectHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Удалить мероприятие «${title}»? Страница исчезнет с сайта.`)) return;
    setBusy(true);
    setError(null);

    const result = await deleteEvent(id);
    setBusy(false);

    // A delete the caller has no rights for removes zero rows without erroring,
    // so without this the row would stay put and look like a glitch.
    if (result.ok) {
      if (redirectHref) router.push(redirectHref);
      else router.refresh();
    } else {
      setError(result.error ?? "Не удалось удалить.");
    }
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
