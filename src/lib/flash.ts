import { cookies } from "next/headers";

/**
 * Leaves a message for the next page to show as a toast.
 *
 * For server actions that finish with redirect(): the redirect discards the action's return
 * value, so the message travels in a cookie that FeedbackProvider reads and clears on arrival.
 * Next URL-encodes the value itself, so it is passed raw here. It is readable by the browser on purpose and expires in 30 seconds, so it cannot go stale.
 *
 * Call it right before redirect(), only on success.
 */
export async function flash(message: string, kind: "success" | "error" = "success"): Promise<void> {
  const store = await cookies();
  store.set("flash", JSON.stringify({ k: kind, m: message }), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}
