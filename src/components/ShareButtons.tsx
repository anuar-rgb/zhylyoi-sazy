"use client";

import { useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
};

export default function ShareButtons({ url, title, label, copyLabel, copiedLabel }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — no-op, button label simply won't change.
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  return (
    <div>
      <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.31.65 4.47 1.78 6.31L4 29l7.86-1.75A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.8c-1.98 0-3.83-.55-5.41-1.5l-.39-.23-4.66 1.04 1.03-4.54-.25-.4A9.7 9.7 0 0 1 5.2 15c0-5.96 4.85-10.8 10.8-10.8S26.8 9.04 26.8 15 21.96 24.8 16.004 24.8Zm5.94-8.1c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.43 5.44 4.8.76.33 1.35.53 1.82.68.76.24 1.46.21 2.01.13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
          </svg>
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="h-10 px-4 rounded-full border border-ocean/25 text-ocean text-sm font-semibold hover:bg-ocean hover:text-white hover:border-ocean transition-colors"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
