"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { removeApplication } from "./actions";

export default function DeleteButton({ id, childName }: { id: string; childName: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete() {
    const confirmed = await feedback.confirm({ title: `Удалить заявку «${childName}»?`, confirmLabel: "Удалить", danger: true });
    if (!confirmed) return;
    setBusy(true);
    setFailed(false);

    const result = await removeApplication(id);
    setBusy(false);

    // A delete the caller has no rights for removes zero rows without erroring, so
    // without this the row would simply stay put and look like a glitch.
    if (result.ok) {
      feedback.success("Заявка удалена");
      router.refresh();
    } else {
      setFailed(true);
      feedback.error("Недостаточно прав для удаления");
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
      {failed && <p className="text-xs text-red-600 mt-1">Недостаточно прав для удаления</p>}
    </div>
  );
}
