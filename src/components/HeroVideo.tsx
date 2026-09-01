"use client";

import { useRef, useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  { eyebrow: string; titleGold: string; titleCream: string; subtitle: string; afisha: string; about: string; mute: string; unmute: string; scroll: string }
> = {
  kk: {
    eyebrow: "«Кең Жылыой» мәдениет үйі",
    titleGold: "Жылыой сазы",
    titleCream: "фольклорлық ансамблі",
    subtitle: "Қазақ халқының бай музыкалық мұрасын сақтау, дамыту және келер ұрпаққа жеткізу",
    afisha: "Афиша",
    about: "Ансамбль туралы",
    mute: "Дыбысты өшіру",
    unmute: "Дыбысты қосу",
    scroll: "Төмен айналдыру",
  },
  ru: {
    eyebrow: "Дом культуры «Кен Жылыой»",
    titleGold: "Жылыой сазы",
    titleCream: "фольклорный ансамбль",
    subtitle: "Сохранение, развитие и передача будущим поколениям богатого музыкального наследия казахского народа",
    afisha: "Афиша",
    about: "Об ансамбле",
    mute: "Выключить звук",
    unmute: "Включить звук",
    scroll: "Прокрутить вниз",
  },
};

export default function HeroVideo() {
  const locale = useLocale() as Locale;
  const t = content[locale];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  function handleUnmute() {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  }

  function handleMute() {
    if (videoRef.current) {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  }

  function handleScroll() {
    const el = document.getElementById("afisha");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative bg-black overflow-hidden">
      {/* Video — portrait on mobile, landscape on desktop */}
      <div className="relative w-full h-[100svh] lg:h-[85vh]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/videos/ensemble-2026.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        {/* Content overlay */}
        {showOverlay && (
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-12 pb-20 sm:pb-16 lg:pb-20">
            <div className="max-w-3xl">
              <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3 animate-fade-in">
                {t.eyebrow}
              </p>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-5 leading-tight text-white animate-fade-in-delay-1">
                <span className="text-gold">{t.titleGold}</span>
                <br />
                <span className="text-cream">{t.titleCream}</span>
              </h1>
              <p className="text-sm sm:text-lg lg:text-xl text-white/70 mb-5 sm:mb-7 max-w-xl leading-relaxed animate-fade-in-delay-2">
                {t.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-delay-3">
                <a
                  href="#afisha"
                  onClick={(e) => { e.preventDefault(); handleScroll(); }}
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 bg-gold text-darkred font-semibold rounded-lg hover:bg-gold-light active:scale-95 transition-all text-base sm:text-lg"
                >
                  {t.afisha}
                </a>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 active:scale-95 transition-all text-base sm:text-lg"
                >
                  {t.about}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mute/unmute button */}
        <button
          onClick={isMuted ? handleUnmute : handleMute}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
          aria-label={isMuted ? t.unmute : t.mute}
        >
          {isMuted ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        {/* Scroll down indicator */}
        <button
          onClick={handleScroll}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 hover:text-white animate-bounce transition-colors"
          aria-label={t.scroll}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </section>
  );
}
