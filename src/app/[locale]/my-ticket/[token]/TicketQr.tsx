"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders one seat's ticket_code as an actual scannable QR, generated on the
 * client with the already-installed `qrcode` package. Only ever mounted for a
 * confirmed booking's items — pending/cancelled/expired seats show no QR at
 * all, since there is nothing for the door to honour yet.
 */
export default function TicketQr({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 160, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return <div className="w-28 h-28 rounded-2xl bg-cream/60 animate-pulse shrink-0" aria-hidden />;
  }

  return (
    // A client-generated data: URL — next/image has nothing to optimize here,
    // it would just add a decode round-trip for an image already in memory.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR-код билета"
      width={112}
      height={112}
      className="w-28 h-28 rounded-2xl border border-cream-dark bg-white p-1.5 shrink-0"
    />
  );
}
