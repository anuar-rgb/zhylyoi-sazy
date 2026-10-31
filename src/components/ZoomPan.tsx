"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type ZoomPanLabels = {
  zoomIn: string;
  zoomOut: string;
  fit: string;
  /** Shown under the map while the whole hall is in view and it can be enlarged. */
  hint: string;
};

/** How far past the fitted size one may zoom in (and never less than the hall's natural size). */
const MAX_ZOOM = 3;
/** Finger travel, in px, under which a touch is still a tap on a seat rather than a drag. */
const TAP_SLOP = 8;

type Size = { box: number; w: number; h: number };
type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

function limits(size: Size) {
  const fit = size.w > 0 && size.box > 0 ? Math.min(1, size.box / size.w) : 1;
  return { fit, max: Math.max(1, fit * MAX_ZOOM), boxHeight: Math.round(size.h * fit) };
}

/** Keeps the picture covering the box when larger than it, and centred when smaller. */
function clampView(size: Size, next: View): View {
  const { fit, max, boxHeight } = limits(size);
  const scale = Math.min(max, Math.max(fit, next.scale));
  const w = size.w * scale;
  const h = size.h * scale;
  const x = w <= size.box ? (size.box - w) / 2 : Math.min(0, Math.max(size.box - w, next.x));
  const y = h <= boxHeight ? (boxHeight - h) / 2 : Math.min(0, Math.max(boxHeight - h, next.y));
  return { scale, x, y };
}

/**
 * Pinch-to-zoom and drag for a wide picture, here the hall's seat map.
 *
 * It opens fitted: the whole hall and the stage in view, scaled down to the box's width. Two
 * fingers (or the +/− buttons, or Ctrl + mouse wheel) zoom around their midpoint; once zoomed, one
 * finger or the mouse drags it about. A touch that barely moves is still a tap and reaches the seat
 * under it; a real drag swallows the click that follows, so panning never picks a seat by accident.
 *
 * While fitted, a one-finger vertical swipe still scrolls the page (touch-action: pan-y); once
 * zoomed in, every gesture on the map belongs to the map.
 */
export default function ZoomPan({ children, labels }: { children: ReactNode; labels: ZoomPanLabels }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ box: 0, w: 0, h: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  // The latest of both, for pointer handlers that fire faster than React re-renders.
  const sizeRef = useRef(size);
  const viewRef = useRef(view);

  const apply = useCallback((next: View) => {
    const clamped = clampView(sizeRef.current, next);
    viewRef.current = clamped;
    setView(clamped);
  }, []);

  // Measure the box and the picture's natural size; a change (rotating the phone) starts fitted again.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const measure = () => {
      const next = { box: box.clientWidth, w: content.offsetWidth, h: content.offsetHeight };
      const prev = sizeRef.current;
      if (prev.box === next.box && prev.w === next.w && prev.h === next.h) return;
      sizeRef.current = next;
      setSize(next);
      apply({ scale: limits(next).fit, x: 0, y: 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, [apply]);

  /** Zooms to `scale`, keeping the picture point under `at` (box coordinates) in place. */
  const zoomAt = useCallback(
    (scale: number, at: Point) => {
      const v = viewRef.current;
      const { fit, max } = limits(sizeRef.current);
      const target = Math.min(max, Math.max(fit, scale));
      const k = target / v.scale;
      apply({ scale: target, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k });
    },
    [apply]
  );

  // --- pointers: one drags, two pinch ------------------------------------------------------
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; scale: number; mid: Point } | null>(null);
  const drag = useRef<{ start: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  /** Keeps a pointer on the map; a pointer the browser no longer tracks is simply left alone. */
  function capture(id: number) {
    try {
      boxRef.current?.setPointerCapture(id);
    } catch {
      // already lifted
    }
  }

  function local(e: { clientX: number; clientY: number }): Point {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startPinch() {
    const [a, b] = [...pointers.current.values()];
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      scale: viewRef.current.scale,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
    drag.current = null;
    suppressClick.current = true;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) drag.current = { start: local(e), moved: false };
    if (pointers.current.size === 2) {
      startPinch();
      // A pinch has begun: both fingers belong to the map until they lift.
      for (const id of pointers.current.keys()) capture(id);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const point = local(e);
    pointers.current.set(e.pointerId, point);

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = Math.min(limits(sizeRef.current).max, Math.max(limits(sizeRef.current).fit, pinch.current.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist)));
      // The picture point that was under the fingers' midpoint stays under it: zoom and pan in one.
      const v = viewRef.current;
      const cx = (pinch.current.mid.x - v.x) / v.scale;
      const cy = (pinch.current.mid.y - v.y) / v.scale;
      apply({ scale, x: mid.x - cx * scale, y: mid.y - cy * scale });
      pinch.current.mid = mid;
      return;
    }

    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(point.x - d.start.x, point.y - d.start.y) < TAP_SLOP) return;
      d.moved = true;
      suppressClick.current = true;
      // From here on it is a drag, not a tap: keep the pointer even when it leaves the map.
      capture(e.pointerId);
    }
    const fitted = viewRef.current.scale <= limits(sizeRef.current).fit + 0.001;
    if (fitted && e.pointerType !== "mouse") return; // fitted: a swipe scrolls the page instead
    const v = viewRef.current;
    apply({ scale: v.scale, x: v.x + (point.x - prev.x), y: v.y + (point.y - prev.y) });
  }

  function onPointerEnd(e: React.PointerEvent) {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      // One finger left after a pinch: carry on as a drag from where it is.
      const [p] = [...pointers.current.values()];
      drag.current = { start: p, moved: true };
    }
    if (pointers.current.size === 0) {
      drag.current = null;
      // A tap leaves suppressClick false, so its click reaches the seat; after a drag or pinch the
      // click that follows (if any) is swallowed once, then normal taps work again.
      setTimeout(() => (suppressClick.current = false), 0);
    }
  }

  // The click a drag or pinch ends with must not select the seat it happened to end on.
  function onClickCapture(e: React.MouseEvent) {
    if (!suppressClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick.current = false;
  }

  // Ctrl + wheel (and a trackpad pinch, which browsers report the same way) zooms; a plain wheel scrolls the page.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      zoomAt(viewRef.current.scale * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const { fit, max, boxHeight } = limits(size);
  const zoomed = view.scale > fit + 0.001;
  const canZoom = max > fit + 0.001;
  const center = { x: size.box / 2, y: boxHeight / 2 };

  return (
    <div>
      {canZoom && (
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs text-ocean/50 min-w-0">{zoomed ? "" : labels.hint}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <ZoomButton label={labels.zoomOut} onClick={() => zoomAt(view.scale / 1.6, center)} disabled={!zoomed}>
              <path strokeLinecap="round" strokeWidth={2} d="M6 12h12" />
            </ZoomButton>
            <ZoomButton label={labels.zoomIn} onClick={() => zoomAt(view.scale * 1.6, center)} disabled={view.scale >= max - 0.001}>
              <path strokeLinecap="round" strokeWidth={2} d="M12 6v12M6 12h12" />
            </ZoomButton>
            <ZoomButton label={labels.fit} onClick={() => apply({ scale: fit, x: 0, y: 0 })} disabled={!zoomed}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </ZoomButton>
          </div>
        </div>
      )}
      <div
        ref={boxRef}
        className="relative overflow-hidden select-none"
        style={{ height: boxHeight || undefined, touchAction: zoomed ? "none" : "pan-y", cursor: zoomed ? "grab" : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 w-max origin-top-left will-change-transform"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {children}
        </div>

      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full bg-white/95 border border-cream-dark shadow-sm text-ocean flex items-center justify-center hover:bg-cream disabled:opacity-40"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
