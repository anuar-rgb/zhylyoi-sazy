"use client";

import { useRef, useState } from "react";
import { youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";

export type VideoItem = {
  kind: "youtube" | "file";
  /** Eleven characters when the recording is on YouTube. */
  youtubeId: string | null;
  /** Path inside the application when the recording is a file we serve. */
  filePath: string | null;
  title: string;
  description: string;
  venueLine: string;
  badge: string;
};

/**
 * One recording, with its poster over it until somebody starts it.
 *
 * Nothing loads before the click — not the file, not the YouTube player. A page
 * with several recordings would otherwise pull in a player for each one and, on a
 * phone connection, spend the visitor's data on videos they never watch. The
 * poster is a thumbnail YouTube already generates, so it costs one small image.
 *
 * The two kinds share this component because they share everything a visitor sees:
 * the same frame, the same poster, the same captions. Only what sits behind the
 * play button differs.
 */
export default function VideoCard({ video }: { video: VideoItem }) {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleStart() {
    setStarted(true);
    // A file needs telling to play; the YouTube frame starts on its own because it
    // is only created at this moment, with autoplay in its address.
    if (video.kind === "file") videoRef.current?.play();
  }

  const poster =
    video.kind === "youtube" && video.youtubeId ? youtubeThumbnailUrl(video.youtubeId) : null;

  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-cream-dark bg-black group">
        {video.kind === "youtube" ? (
          started && video.youtubeId ? (
            <iframe
              className="w-full aspect-video"
              src={`${youtubeEmbedUrl(video.youtubeId)}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full aspect-video">
              {/* Plain img: the thumbnail is served by YouTube, and routing someone
                  else's image through the optimiser buys nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {poster && <img src={poster} alt="" className="w-full h-full object-cover" />}
            </div>
          )
        ) : (
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            controls={started}
            onPause={() => setStarted(false)}
            onEnded={() => setStarted(false)}
            onPlay={() => setStarted(true)}
            preload="metadata"
            playsInline
          >
            {video.filePath && <source src={video.filePath} type="video/mp4" />}
          </video>
        )}

        {!started && (
          <button
            type="button"
            onClick={handleStart}
            aria-label={video.title}
            className="absolute inset-0 w-full flex flex-col items-center justify-center cursor-pointer bg-gradient-to-t from-black/70 via-black/30 to-transparent"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/90 hover:bg-gold flex items-center justify-center transition-all hover:scale-110 shadow-2xl">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-ocean ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-left">
              <h3 className="text-white font-bold text-lg sm:text-xl mb-1">{video.title}</h3>
              {video.venueLine && <p className="text-white/70 text-xs sm:text-sm">{video.venueLine}</p>}
            </div>

            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              {video.badge}
            </div>
          </button>
        )}
      </div>

      <div className="mt-3 sm:mt-4 bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-cream-dark">
        <h3 className="font-bold text-ocean text-base sm:text-lg mb-1">{video.title}</h3>
        {video.description && <p className="text-ocean/60 text-sm">{video.description}</p>}
      </div>
    </div>
  );
}
