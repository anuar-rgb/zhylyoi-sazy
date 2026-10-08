"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { clearApplicationHistory, hideApplication } from "../actions";

/**
 * «Скрыть» on a card in the history feed, or «Вернуть в историю» in the list of hidden ones.
 * Only the feed changes: the summary and the club's own list keep the application.
 */
export function HideButton({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await hideApplication(id, !hidden);
    setBusy(false);
    if (result.ok) {
      feedback.success(hidden ? "Заявка возвращена в историю" : "Заявка скрыта из истории");
      router.refresh();
    } else {
      feedback.error("Не удалось сохранить.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-xs font-semibold text-ocean/40 hover:text-ocean transition-colors disabled:opacity-50"
    >
      {busy ? "…" : hidden ? "Вернуть в историю" : "Скрыть"}
    </button>
  );
}

/** «Очистить историю»: hides every processed and rejected application from the feed at once. */
export function ClearHistoryButton({ count }: { count: number }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const confirmed = await feedback.confirm({
      title: "Очистить историю заявок?",
      message: `Из ленты пропадут обработанные и отклонённые заявки (${count}). Новые и в работе останутся. Сводка и списки кружков не изменятся, скрытые можно вернуть.`,
      confirmLabel: "Очистить",
    });
    if (!confirmed) return;
    setBusy(true);
    const result = await clearApplicationHistory();
    setBusy(false);
    if (result.ok) {
      feedback.success(result.hidden > 0 ? `Скрыто из истории: ${result.hidden}` : "Нечего скрывать");
      router.refresh();
    } else {
      feedback.error("Не удалось очистить историю.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || count === 0}
      className="text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? "Очищаю…" : "Очистить историю"}
    </button>
  );
}
