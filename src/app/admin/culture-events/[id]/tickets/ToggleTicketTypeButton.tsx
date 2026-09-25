"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTicketTypeActive } from "./actions";

export default function ToggleTicketTypeButton({
  id,
  eventId,
  isActive,
}: {
  id: string;
  eventId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // This button sits inside a <summary> (the card is a <details> accordion); a
    // plain click would also toggle that open/closed, since the click bubbles up
    // to the summary's own default behaviour.
    e.preventDefault();
    e.stopPropagation();

    setBusy(true);
    const result = await setTicketTypeActive(id, eventId, !isActive);
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
        isActive ? "bg-gold/15 text-ocean-dark hover:bg-gold/25" : "bg-ocean/5 text-ocean/50 hover:bg-ocean/10"
      }`}
    >
      {isActive ? "Показывается" : "Скрыт"}
    </button>
  );
}
