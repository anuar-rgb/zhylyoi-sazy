"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

/**
 * A live countdown to a pending booking's hold expiry. When it reaches zero it
 * refreshes the page rather than trying to guess the new status itself —
 * get_booking_by_token runs expire_stale_booking on every read, so the next
 * fetch is what actually flips the booking to "expired" server-side.
 */
export default function Countdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const kk = useLocale() === "kk";
  // Null until the browser has the clock: the server and the browser read it a moment apart, and
  // rendering the number on both made React report a mismatch on every page load.
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const left = target - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        router.refresh();
      }
    };
    const interval = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(first);
    };
  }, [expiresAt, router]);

  if (remainingMs === null) return <p className="text-sm text-ocean/70">&nbsp;</p>;

  if (remainingMs <= 0) return <p className="text-sm text-ocean/60">{kk ? "Бронь уақыты аяқталуда…" : "Время брони истекает…"}</p>;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <p className="text-sm text-ocean/70">
      {kk ? "Орын тағы" : "Место удерживается ещё"}{" "}
      <span className="font-bold text-ocean">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
      {kk ? " ұсталады" : ""}
    </p>
  );
}
