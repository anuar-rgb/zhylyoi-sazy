"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markSeen } from "../actions";

/**
 * Clears the red dot once this page has actually rendered in the browser.
 *
 * A client component's effect runs only after it mounts on the client — not when
 * Next.js prefetches the route's server payload on link hover — so hovering over
 * «Заявки» can never clear the dot before anyone has really looked. Renders nothing;
 * it exists purely to fire once and refresh the layout's badge.
 */
export default function MarkSeenOnView({ hasUnseen }: { hasUnseen: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasUnseen) return;
    markSeen().then((result) => {
      if (result.ok) router.refresh();
    });
    // Once per real visit: re-running this on every re-render would refresh in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
