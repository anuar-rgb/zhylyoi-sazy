"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkPassword, createSessionCookieValue, isValidSession, COOKIE_NAME } from "@/lib/adminAuth";
import { deleteApplication } from "@/lib/applications";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(password: string): Promise<LoginResult> {
  if (!checkPassword(password)) {
    return { ok: false, error: "wrong_password" };
  }
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 7 * 24 * 60 * 60,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE_NAME, path: "/admin" });
}

export async function removeApplication(id: string): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(COOKIE_NAME)?.value)) return;
  await deleteApplication(id);
  revalidatePath("/admin");
}
