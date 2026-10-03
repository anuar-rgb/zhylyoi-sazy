"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * In-site feedback: short toasts ("Сохранено", "Удалено") and a confirm dialog in the site's own
 * style, instead of the browser's grey confirm() box.
 *
 * No next-intl import on purpose. The admin has its own root layout without that provider, and
 * importing it there crashes for signed-in staff (see AGENTS.md). Callers pass the wording.
 *
 * Server actions that end in redirect() cannot call a client hook, so they leave a short-lived
 * `flash` cookie (src/lib/flash.ts) and this provider turns it into a toast on arrival.
 */
export type ToastKind = "success" | "error";

type Toast = { id: number; kind: ToastKind; message: string; leaving: boolean };

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button; true for anything that deletes. */
  danger?: boolean;
};

type Feedback = {
  success: (message: string) => void;
  error: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const SHOW_MS = { success: 3800, error: 6500 } as const;
const LEAVE_MS = 220;
const FLASH_COOKIE = "flash";

/** Outside a provider nothing should crash: toasts are skipped and confirm falls back to the browser. */
const FALLBACK: Feedback = {
  success: () => {},
  error: () => {},
  confirm: async (options) => (typeof window !== "undefined" ? window.confirm(options.title) : false),
};

const FeedbackContext = createContext<Feedback>(FALLBACK);

export function useFeedback(): Feedback {
  return useContext(FeedbackContext);
}

/**
 * Shows the outcome of a useActionState form. The first state is the form's initial one and is
 * ignored; every state after it is a result. An action that redirects on success never returns,
 * so for those only failures arrive here.
 */
export function useActionToast(state: { error: string | null }, successMessage?: string) {
  const feedback = useFeedback();
  const initial = useRef(state);

  useEffect(() => {
    if (state === initial.current) return;
    if (state.error) feedback.error(state.error);
    else if (successMessage) feedback.success(successMessage);
  }, [state, successMessage, feedback]);
}

function readFlash(): { kind: ToastKind; message: string } | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${FLASH_COOKIE}=`));
  if (!match) return null;
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(FLASH_COOKIE.length + 1))) as {
      k?: unknown;
      m?: unknown;
    };
    if (typeof parsed.m !== "string" || !parsed.m) return null;
    return { kind: parsed.k === "error" ? "error" : "success", message: parsed.m };
  } catch {
    return null;
  }
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path className="toast-check" strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.2 3.2L15 6.8" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

export default function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const nextId = useRef(1);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), LEAVE_MS);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, kind, message, leaving: false }]);
      window.setTimeout(() => dismiss(id), SHOW_MS[kind]);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setDialog({ options, resolve });
      }),
    []
  );

  const feedback = useMemo<Feedback>(
    () => ({ success: (m) => push("success", m), error: (m) => push("error", m), confirm }),
    [push, confirm]
  );

  // A redirect from a server action lands on a new path: pick up what it left behind.
  useEffect(() => {
    const flash = readFlash();
    if (flash) push(flash.kind, flash.message);
  }, [pathname, push]);

  const answer = useCallback(
    (ok: boolean) => {
      setDialog((current) => {
        current?.resolve(ok);
        return null;
      });
      returnFocus.current?.focus();
    },
    []
  );

  useEffect(() => {
    if (!dialog) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, answer]);

  return (
    <FeedbackContext.Provider value={feedback}>
      {children}

      <div
        aria-live="polite"
        className="fixed z-[100] top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg ${
              t.leaving ? "toast-out" : "toast-in"
            } ${t.kind === "error" ? "border-red-200" : "border-cream-dark"}`}
          >
            <span
              className={`mt-0.5 grid place-items-center w-7 h-7 rounded-full shrink-0 text-white ${
                t.kind === "error" ? "bg-red-600" : "bg-ocean"
              }`}
            >
              {t.kind === "error" ? <CrossIcon /> : <CheckIcon />}
            </span>
            <p className={`flex-1 text-sm font-semibold leading-snug pt-1 ${t.kind === "error" ? "text-red-700" : "text-ocean"}`}>
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Закрыть"
              className="text-ocean/40 hover:text-ocean transition-colors p-1 -mr-1 shrink-0"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center p-4 bg-black/50 dialog-backdrop"
          onClick={() => answer(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm w-full dialog-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="feedback-title" className="text-lg font-bold text-ocean leading-snug">
              {dialog.options.title}
            </h2>
            {dialog.options.message && <p className="mt-2 text-sm text-ocean/60 whitespace-pre-line">{dialog.options.message}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => answer(false)}
                className="px-4 py-2.5 text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors"
              >
                {dialog.options.cancelLabel ?? "Отмена"}
              </button>
              <button
                type="button"
                onClick={() => answer(true)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-colors ${
                  dialog.options.danger ? "bg-red-600 hover:bg-red-700" : "bg-ocean hover:bg-ocean-dark"
                }`}
              >
                {dialog.options.confirmLabel ?? "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
