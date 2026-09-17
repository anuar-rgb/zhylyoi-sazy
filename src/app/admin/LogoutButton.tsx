"use client";

import { useState } from "react";
import { signOut } from "./actions";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async () => {
        setBusy(true);
        await signOut();
      }}
    >
      <button
        type="submit"
        disabled={busy}
        className="text-sm font-semibold text-cream/70 hover:text-gold transition-colors disabled:opacity-50"
      >
        Выйти
      </button>
    </form>
  );
}
