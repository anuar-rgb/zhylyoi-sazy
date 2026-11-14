"use client";

import { useState } from "react";
import type { PlatformState } from "./actions";

/** Shared look of the platform pages. */
export const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
export const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";
export const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm p-5 sm:p-6";
export const INITIAL: PlatformState = { ok: false, message: null };

export function Notice({ state }: { state: PlatformState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`text-sm rounded-2xl px-4 py-3 mt-3 ${
        state.ok ? "bg-gold/15 border border-gold/40 text-ocean-dark" : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

/** A password link to hand over: shown in full, with a copy button. */
export function LinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-2xl border border-cream-dark bg-cream/40 p-3">
      <p className="text-xs text-ocean/60 mb-2">Ссылка для пароля (действует сутки, один раз):</p>
      <p className="text-xs font-mono text-ocean break-all select-all">{link}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
        className="mt-2 px-4 py-2 rounded-full border border-cream-dark bg-white text-sm font-semibold text-ocean hover:bg-cream/50"
      >
        {copied ? "Скопировано" : "Скопировать"}
      </button>
    </div>
  );
}
