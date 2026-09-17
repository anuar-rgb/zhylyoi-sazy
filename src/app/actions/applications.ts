"use server";

import { randomUUID } from "crypto";
import { appendApplication } from "@/lib/applications";
import { notifyTelegram } from "@/lib/telegram";

export type ApplicationInput = {
  childName: string;
  age: string;
  parentPhone: string;
  clubTitle: string;
  comment: string;
  consent: boolean;
};

export type SubmitResult = { ok: true } | { ok: false; error: "consent" | "missing" };

export async function submitClubApplication(input: ApplicationInput): Promise<SubmitResult> {
  if (!input.consent) return { ok: false, error: "consent" };
  if (!input.childName.trim() || !input.parentPhone.trim() || !input.age.trim()) {
    return { ok: false, error: "missing" };
  }

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    childName: input.childName.trim(),
    age: input.age.trim(),
    parentPhone: input.parentPhone.trim(),
    clubTitle: input.clubTitle,
    comment: input.comment.trim(),
    consent: input.consent,
  };

  await appendApplication(record);
  await notifyTelegram(record);

  return { ok: true };
}
