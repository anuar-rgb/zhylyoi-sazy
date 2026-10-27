"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const ITEM_HEIGHT = 36;
const COLUMN_HEIGHT = 7 * ITEM_HEIGHT;

/**
 * A date and a time, submitted as one "YYYY-MM-DDTHH:mm" value under `name` — what a
 * datetime-local input sends, so the server actions read it unchanged.
 *
 * The date keeps the browser's own calendar. The time does not: the browser's time columns
 * leave the chosen hour and minute wherever they happen to scroll, usually at an edge. Here
 * they always stand in the middle of their column, with the neighbouring values above and below.
 */
export default function DateTimeField({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  /** "YYYY-MM-DDTHH:mm", or empty. */
  defaultValue?: string | null;
  required?: boolean;
}) {
  const [date, setDate] = useState(defaultValue?.slice(0, 10) ?? "");
  const [hour, setHour] = useState(defaultValue ? defaultValue.slice(11, 13) : "");
  const [minute, setMinute] = useState(defaultValue ? defaultValue.slice(14, 16) : "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const hasTime = hour !== "" && minute !== "";
  const value = date && hasTime ? `${date}T${hour}:${minute}` : "";

  // A date without a time is not a moment yet: the form will not send until the time is chosen.
  useEffect(() => {
    dateRef.current?.setCustomValidity(date && !hasTime ? "Выберите время" : "");
  }, [date, hasTime]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div>
      <label className={LABEL} htmlFor={`${name}-date`}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        <input
          ref={dateRef}
          id={`${name}-date`}
          type="date"
          value={date}
          required={required}
          onChange={(e) => setDate(e.target.value)}
          className={`${INPUT} min-w-0 flex-1`}
        />
        <div ref={boxRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${label}: время`}
            className={`${INPUT} w-[6.5rem] flex items-center justify-between gap-2 ${hasTime ? "" : "text-ocean/40"}`}
          >
            {hasTime ? `${hour}:${minute}` : "--:--"}
            <svg className="w-4 h-4 text-ocean/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 2" />
            </svg>
          </button>
          {open && (
            <div
              role="dialog"
              aria-label="Время"
              className="absolute right-0 top-full mt-2 z-30 bg-white rounded-2xl border border-cream-dark shadow-lg p-2"
            >
              <div className="relative flex gap-1">
                {/* The band the chosen values sit in: the middle of both columns. */}
                <div
                  className="pointer-events-none absolute inset-x-0 rounded-xl bg-ocean/10"
                  style={{ top: (COLUMN_HEIGHT - ITEM_HEIGHT) / 2, height: ITEM_HEIGHT }}
                  aria-hidden
                />
                <TimeColumn label="Часы" values={HOURS} selected={hour} onSelect={(h) => { setHour(h); if (!minute) setMinute("00"); }} />
                <TimeColumn label="Минуты" values={MINUTES} selected={minute} onSelect={(m) => { setMinute(m); if (!hour) setHour("00"); }} />
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-cream-dark">
                {!required && (date || hasTime) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDate("");
                      setHour("");
                      setMinute("");
                      setOpen(false);
                    }}
                    className="px-2 py-1 text-xs font-semibold text-ocean/50 hover:text-red-600"
                  >
                    Очистить
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1 rounded-full bg-ocean text-cream text-xs font-semibold"
                >
                  Готово
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One scrolling column; the chosen value is kept in its middle. */
function TimeColumn({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Opening puts the chosen value in the middle at once; choosing another one glides there.
  useLayoutEffect(() => {
    const column = ref.current;
    if (!column) return;
    const index = Math.max(0, values.indexOf(selected));
    const top = index * ITEM_HEIGHT;
    column.scrollTo({ top, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [selected, values]);

  const pad = (COLUMN_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className="relative w-14 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: COLUMN_HEIGHT, paddingTop: pad, paddingBottom: pad }}
    >
      {values.map((value) => (
        <button
          key={value}
          type="button"
          role="option"
          aria-selected={value === selected}
          onClick={() => onSelect(value)}
          style={{ height: ITEM_HEIGHT }}
          className={`relative w-full rounded-lg text-sm tabular-nums transition-colors ${
            value === selected ? "font-bold text-ocean" : "text-ocean/60 hover:bg-cream/60 hover:text-ocean"
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
