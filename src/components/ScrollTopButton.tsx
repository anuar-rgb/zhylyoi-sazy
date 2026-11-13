"use client";

import { useEffect, useRef, useState } from "react";

/** How far down the page, in px, before the button shows. */
const SHOW_AFTER = 250;
/** A press that moves less than this, in px, is a tap, not a drag. */
const DRAG_THRESHOLD = 6;
/** The button always keeps this far, in px, from the edges of the screen. */
const EDGE = 8;

type Offset = { x: number; y: number };

/**
 * «Наверх»: one floating button on every page, site and admin alike, mounted once in each
 * layout. Hidden at the top of the page, it fades in once the page is scrolled past
 * SHOW_AFTER and brings the reader back to the top — the menu, the filters, the page's own
 * «← Назад» link are all up there. Bottom-right: the toasts sit at the top, and the full-screen
 * mobile menu (z-50) covers it while open.
 *
 * It can be dragged, with a mouse or a finger, out of the way of what is under it. A press that
 * barely moves is still a tap and scrolls to the top. The new place is kept only in memory: it
 * survives moving between pages (the layout stays mounted) and is gone on a reload, when the button
 * is back bottom-right. It never leaves the screen, also when the window is resized or turned.
 */
export default function ScrollTopButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; from: Offset; base: DOMRect; moved: boolean } | null>(null);
  // Set when a press turned into a drag, so the click the browser fires on release does not scroll.
  const swallowClick = useRef(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // A smaller window (resize, phone turned) must not leave the button outside it.
  useEffect(() => {
    const keepInside = () => {
      const el = wrapper.current;
      if (!el) return;
      setOffset((current) => {
        const rect = el.getBoundingClientRect();
        const base = { left: rect.left - current.x, top: rect.top - current.y, width: rect.width, height: rect.height };
        const next = clamp(current, base);
        return next.x === current.x && next.y === current.y ? current : next;
      });
    };
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, []);

  function toTop() {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || !wrapper.current) return;
    const rect = wrapper.current.getBoundingClientRect();
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: offset,
      // Where the button would stand with no offset: the fixed bottom-right spot.
      base: new DOMRect(rect.left - offset.x, rect.top - offset.y, rect.width, rect.height),
      moved: false,
    };
    swallowClick.current = false;
    // Captured at once, not at the first move: a quick flick leaves the button before the next
    // pointermove, and without capture those moves would go to whatever is underneath.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
    }
    setOffset(clamp({ x: d.from.x + dx, y: d.from.y + dy }, d.base));
  }

  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) swallowClick.current = true;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div
      ref={wrapper}
      // The drag offset lives on this wrapper, the show/hide slide on the button: two transforms that
      // would otherwise fight, and the drag must follow the pointer with no transition lag.
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 pointer-events-none"
    >
      <button
        type="button"
        onClick={toTop}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label={label}
        title={label}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        // touch-none: a finger on the button drags it instead of scrolling the page.
        className={`touch-none select-none flex items-center gap-2 h-11 sm:h-12 pl-3.5 pr-4 rounded-full bg-ocean/90 text-cream backdrop-blur shadow-lg ring-1 ring-white/20 text-sm font-semibold hover:bg-ocean transition-[opacity,transform,background-color] duration-300 ${
          dragging ? "cursor-grabbing scale-105 shadow-xl" : "active:scale-95"
        } ${visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-6 6m6-6l6 6" />
        </svg>
        {label}
      </button>
    </div>
  );
}

/**
 * How far from the top of the screen the button may go: below a header that stays on screen (the
 * site's sticky header sits above the button and would swallow every press on it). Its full height
 * counts even while it is slid away on scrolling down, since it comes back on scrolling up.
 */
function topLimit(): number {
  const header = document.querySelector("header");
  if (!header) return EDGE;
  const position = getComputedStyle(header).position;
  return position === "sticky" || position === "fixed" ? header.offsetHeight + EDGE : EDGE;
}

/** The offset nearest to the wanted one that keeps the whole button on screen and clear of the header. */
function clamp(wanted: Offset, base: { left: number; top: number; width: number; height: number }): Offset {
  const width = document.documentElement.clientWidth;
  const height = window.innerHeight;
  const minX = EDGE - base.left;
  const maxX = width - EDGE - base.width - base.left;
  const minY = topLimit() - base.top;
  const maxY = height - EDGE - base.height - base.top;
  return {
    x: Math.round(Math.min(Math.max(wanted.x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(wanted.y, minY), Math.max(minY, maxY))),
  };
}
