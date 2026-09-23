"use client";

import { useRef, useState } from "react";

export type VideoItem = {
  src: string;
  title: string;
  description: string;
  venueLine: string;
};

/**
 * One video with its own poster overlay.
 *
 * Split out of the page so the page can stay a server component: it is the play
 * state that needs the browser, not the surrounding text, and the page reads the
 * institution's editable wording, which only a server component can await.
 */
export default function VideoCard({ video, badge }: { video: VideoItem; badge: string }) {
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
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-cream-dark bg-black group">
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
              <h3 className="text-white font-bold text-lg sm:text-xl mb-1">{video.title}</h3>
              <p className="text-white/70 text-xs sm:text-sm">{video.venueLine}</p>
            </div>

            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              {badge}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-cream-dark">
        <h3 className="font-bold text-ocean text-base sm:text-lg mb-1">{video.title}</h3>
        <p className="text-ocean/60 text-sm">{video.description}</p>
      </div>
    </div>
  );
}
