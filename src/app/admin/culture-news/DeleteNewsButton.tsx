"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { deleteNews } from "./actions";

export default function DeleteNewsButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = await feedback.confirm({ title: `Удалить новость «${title}»?`, message: `Страница исчезнет с сайта.`, confirmLabel: "Удалить", danger: true });
    if (!confirmed) return;
    setBusy(true);
    setError(null);

    const result = await deleteNews(id);
    setBusy(false);

    // A delete the caller has no rights for removes zero rows without erroring,
    // so without this the row would stay put and look like a glitch.
    if (result.ok) {
      feedback.success("Удалено");
      router.refresh();
    } else {
      const message = result.error ?? "Не удалось удалить.";
      setError(message);
      feedback.error(message);
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
