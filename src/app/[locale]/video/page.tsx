"use client";

import { useState, useRef } from "react";
import { useLocale } from "next-intl";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    badge: string;
    footer: string;
    videos: { src: string; title: string; description: string; date: string; venueLine: string }[];
  }
> = {
  kk: {
    title: "Бейне",
    subtitle: "Ансамбль концерттері мен іс-шаралардан бейнежазбалар",
    badge: "Бейне",
    footer: "Жаңа бейнежазбалар қосылып отырады",
    videos: [
      {
        src: "/videos/ensemble-2026.mp4",
        title: "«Жылыой сазы» фольклорлық ансамблі",
        description: "Ансамбльдің «Кең Жылыой» мәдениет үйіндегі концерттік бейнежазбасы",
        date: "2026",
        venueLine: "«Кең Жылыой» мәдениет үйі, 2026 жыл",
      },
      {
        src: "/videos/concert-2026.mp4",
        title: "Концерттік бейнежазба",
        description: "Ансамбльдің сахнадағы өнер көрсетуі",
        date: "2026",
        venueLine: "«Кең Жылыой» мәдениет үйі, 2026 жыл",
      },
    ],
  },
  ru: {
    title: "Видео",
    subtitle: "Видеозаписи концертов и мероприятий ансамбля",
    badge: "Видео",
    footer: "Видеотека регулярно пополняется новыми записями",
    videos: [
      {
        src: "/videos/ensemble-2026.mp4",
        title: "Фольклорный ансамбль «Жылыой сазы»",
        description: "Концертная видеозапись ансамбля в доме культуры «Кен Жылыой»",
        date: "2026",
        venueLine: "Дом культуры «Кен Жылыой», 2026 год",
      },
      {
        src: "/videos/concert-2026.mp4",
        title: "Концертная видеозапись",
        description: "Выступление ансамбля на сцене",
        date: "2026",
        venueLine: "Дом культуры «Кен Жылыой», 2026 год",
      },
    ],
  },
};

function VideoCard({
  video,
  badge,
}: {
  video: (typeof content)["kk"]["videos"][number];
  badge: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-cream-dark bg-black group">
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          controls={isPlaying}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          preload="metadata"
          playsInline
        >
          <source src={video.src} type="video/mp4" />
        </video>

        {!isPlaying && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            onClick={handlePlay}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/90 hover:bg-gold flex items-center justify-center transition-all hover:scale-110 shadow-2xl">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-ocean ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <h3 className="text-white font-bold text-lg sm:text-xl mb-1">
                {video.title}
              </h3>
              <p className="text-white/70 text-xs sm:text-sm">
                {video.venueLine}
              </p>
            </div>

            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm">
              {badge}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-cream-dark">
        <h3 className="font-bold text-ocean text-base sm:text-lg mb-1">{video.title}</h3>
        <p className="text-ocean/60 text-sm">{video.description}</p>
      </div>
    </div>
  );
}

export default function VideoPage() {
  const locale = useLocale() as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="space-y-8 sm:space-y-10">
          {t.videos.map((video, index) => (
            <FadeIn key={index} delay={index * 150}>
              <VideoCard video={video} badge={t.badge} />
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <div className="mt-8 sm:mt-12 bg-ocean/5 rounded-xl p-6 sm:p-8 text-center">
            <p className="text-ocean/70 text-base sm:text-lg">
              {t.footer}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
