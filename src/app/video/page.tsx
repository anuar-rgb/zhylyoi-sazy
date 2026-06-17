"use client";

import { useState, useRef } from "react";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";

export default function VideoPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function handlePause() {
    setIsPlaying(false);
  }

  function handleEnded() {
    setIsPlaying(false);
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle
            title="Бейне"
            subtitle="Ансамбль концерттері мен іс-шаралардан бейнежазбалар"
          />
        </FadeIn>

        {/* Main video player */}
        <FadeIn>
        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-cream-dark bg-black group">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            controls={isPlaying}
            onPause={handlePause}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            preload="metadata"
            playsInline
          >
            <source src="/videos/ensemble-2026.mp4" type="video/mp4" />
          </video>

          {/* Custom overlay with play button */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-t from-black/70 via-black/30 to-transparent"
              onClick={handlePlay}
            >
              {/* Play button */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold/90 hover:bg-gold flex items-center justify-center transition-all hover:scale-110 shadow-2xl">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-darkred ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              {/* Title over video */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                <h3 className="text-white font-bold text-xl sm:text-2xl mb-1">
                  «Жылыой сазы» фольклорлық ансамблі
                </h3>
                <p className="text-white/70 text-sm sm:text-base">
                  «Кең Жылыой» мәдениет үйі, 2026 жыл
                </p>
              </div>

              {/* Duration badge */}
              <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm">
                Бейне
              </div>
            </div>
          )}
        </div>

        </FadeIn>

        <FadeIn>
        <div className="mt-4 sm:mt-6 bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-cream-dark">
          <h3 className="font-bold text-darkred text-lg mb-2">
            «Жылыой сазы» фольклорлық ансамблі
          </h3>
          <p className="text-darkred/60">
            Ансамбльдің «Кең Жылыой» мәдениет үйіндегі концерттік бейнежазбасы.
            Құрамында 18 кәсіби өнерпаз — домбырашылар, қобызшылар, баяншылар, солисттер және басқа да аспапшылар бар.
          </p>
        </div>

        </FadeIn>

        {/* Info section */}
        <FadeIn>
        <div className="mt-8 sm:mt-12 bg-darkred/5 rounded-xl p-6 sm:p-8 text-center">
          <p className="text-darkred/70 text-base sm:text-lg">
            Жаңа бейнежазбалар қосылып отырады
          </p>
        </div>
        </FadeIn>
      </div>
    </section>
  );
}
