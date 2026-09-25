"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A live countdown to a pending booking's hold expiry. When it reaches zero it
 * refreshes the page rather than trying to guess the new status itself —
 * get_booking_by_token runs expire_stale_booking on every read, so the next
 * fetch is what actually flips the booking to "expired" server-side.
 */
export default function Countdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [remainingMs, setRemainingMs] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const interval = setInterval(() => {
      const left = target - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, router]);

  if (remainingMs <= 0) return <p className="text-sm text-ocean/60">Время брони истекает…</p>;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <p className="text-sm text-ocean/70">
      Место удерживается ещё{" "}
      <span className="font-bold text-ocean">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </p>
  );
}
