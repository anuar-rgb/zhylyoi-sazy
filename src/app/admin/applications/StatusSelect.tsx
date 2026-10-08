"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { markApplication } from "../actions";
// Type only: the module itself talks to the database on the server and must stay out of the browser.
import type { ApplicationStatus } from "@/lib/applications";

const LABELS: Record<ApplicationStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Обработана",
  rejected: "Отклонена",
};

const STYLE: Record<ApplicationStatus, string> = {
  new: "bg-gold/15 text-ocean-dark border-gold/40",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-ocean/5 text-ocean/70 border-ocean/15",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

/**
 * The status of one application as a dropdown: picking a value saves it at once.
 *
 * A native select on purpose: it opens the phone's own picker, works from the keyboard and
 * needs no positioning. While saving it shows the chosen value; if the save fails it goes
 * back to what is stored.
 */
export default function StatusSelect({ id, status, childName }: { id: string; status: ApplicationStatus; childName: string }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  // A refresh after someone else's change brings a new stored status; show it.
  const [stored, setStored] = useState(status);
  if (stored !== status) {
    setStored(status);
    setValue(status);
  }

  async function change(next: ApplicationStatus) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setBusy(true);
    const result = await markApplication(id, next);
    setBusy(false);
    if (result.ok) {
      feedback.success(`Статус: ${LABELS[next].toLowerCase()}`);
      router.refresh();
    } else {
      setValue(previous);
      feedback.error("Не удалось сохранить статус.");
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value as ApplicationStatus)}
      aria-label={`Статус заявки «${childName}»`}
      className={`text-xs font-semibold rounded-full border pl-2.5 pr-7 py-1 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${STYLE[value]}`}
    >
      {(Object.keys(LABELS) as ApplicationStatus[]).map((s) => (
        <option key={s} value={s}>
          {LABELS[s]}
        </option>
      ))}
    </select>
  );
}
