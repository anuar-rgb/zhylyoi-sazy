"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { checkInTicket, type CheckInResult } from "./actions";

type CameraState = "starting" | "active" | "denied" | "unsupported";

/** Long enough to read at a glance, short enough the queue keeps moving. */
const RESULT_DISPLAY_MS = 2500;

const RESULT_TEXT: Record<Exclude<CheckInResult, { ok: true }>["reason"], string> = {
  not_found: "Билет не найден",
  not_confirmed: "Оплата не подтверждена",
  invalid: "Неверный код",
  failed: "Ошибка проверки",
};

/**
 * Owns the camera loop directly with jsQR (a pure decode function, no bundled
 * UI) rather than a library like html5-qrcode that ships its own DOM to
 * restyle. Falls back to manual entry — always visible, not just when the
 * camera fails — if getUserMedia is denied, absent, or the browser doesn't
 * support it at all (notably Safari/iOS lacks the native BarcodeDetector,
 * which is why this doesn't rely on it as the only path).
 */
export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  // A ref, not state: the animation-frame loop reads it every frame and must
  // see the update the instant handleCode sets it, not after a re-render.
  const pausedRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dismissTimer = useRef<number | null>(null);

  const handleCode = useCallback((code: string) => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setSubmitting(true);

    checkInTicket(code).then((res) => {
      setSubmitting(false);
      setResult(res);
      dismissTimer.current = window.setTimeout(() => {
        setResult(null);
        pausedRef.current = false;
      }, RESULT_DISPLAY_MS);
    });
  }, []);

  function dismissEarly() {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setResult(null);
    pausedRef.current = false;
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("active");
        loop();
      } catch {
        setCameraState("denied");
      }
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (!pausedRef.current) {
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(frame.data, frame.width, frame.height);
          if (decoded?.data) handleCode(decoded.data);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [handleCode]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim() || submitting) return;
    handleCode(manualCode.trim());
    setManualCode("");
  }

  return (
    <div>
      {(cameraState === "starting" || cameraState === "active") && (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-w-md mx-auto">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {cameraState === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Запуск камеры…
            </div>
          )}
        </div>
      )}

      {(cameraState === "denied" || cameraState === "unsupported") && (
        <div className="max-w-md mx-auto bg-cream/40 border border-cream-dark rounded-3xl p-6 text-center text-sm text-ocean/60">
          {cameraState === "denied"
            ? "Нет доступа к камере — введите код вручную."
            : "Камера не поддерживается этим браузером — введите код вручную."}
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="max-w-md mx-auto mt-4 flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Код билета вручную"
          disabled={submitting}
          className="flex-1 px-4 py-2.5 border border-cream-dark rounded-full bg-cream/30 text-sm text-ocean focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Проверить
        </button>
      </form>

      {result && (
        <div
          role="button"
          tabIndex={0}
          onClick={dismissEarly}
          onKeyDown={(e) => e.key === "Enter" && dismissEarly()}
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 cursor-pointer text-center text-white ${
            result.ok && result.status === "ok" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          <div>
            {result.ok ? (
              <>
                <p className="text-4xl sm:text-6xl font-bold mb-4">
                  {result.status === "ok" ? "Пропустить" : "Билет уже использован"}
                </p>
                {result.status === "already_used" && result.checkedInAt && (
                  <p className="text-xl sm:text-2xl opacity-90 mb-2">
                    в{" "}
                    {new Date(result.checkedInAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {(result.seatRowLabel || result.seatNumber) && (
                  <p className="text-xl sm:text-2xl opacity-90">
                    Ряд {result.seatRowLabel}, место {result.seatNumber}
                  </p>
                )}
                {result.eventTitle && <p className="text-sm sm:text-base mt-2 opacity-75">{result.eventTitle}</p>}
              </>
            ) : (
              <p className="text-4xl sm:text-6xl font-bold">{RESULT_TEXT[result.reason]}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
