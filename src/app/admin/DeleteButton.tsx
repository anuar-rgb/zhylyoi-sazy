"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeApplication } from "./actions";

export default function DeleteButton({ id, childName }: { id: string; childName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Удалить заявку «${childName}»?`)) return;
    setBusy(true);
    await removeApplication(id);
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-xs font-semibold text-ocean/40 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      Удалить
    </button>
  );
}
