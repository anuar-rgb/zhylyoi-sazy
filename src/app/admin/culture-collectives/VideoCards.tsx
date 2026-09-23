import Link from "next/link";
import type { CultureVideoRecord } from "@/lib/cultureVideos";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import DeleteVideoButton from "../culture-videos/DeleteVideoButton";

/**
 * A collective's recordings, as cards, on the collective's own page.
 *
 * The general Видео section still exists and still works; this is the same
 * recordings reached the other way round. Every link carries ?from=<collective>,
 * so saving or cancelling comes back here instead of landing in the general list.
 */
export default function VideoCards({
  collectiveId,
  videos,
}: {
  collectiveId: string;
  videos: CultureVideoRecord[];
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-ocean">
          Видео <span className="text-ocean/40 font-normal text-base">({videos.length})</span>
        </h2>
        <Link
          href={`/admin/culture-videos/new?club=${collectiveId}`}
          className="btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          Добавить видео
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
          <p className="text-ocean/60">У этого коллектива пока нет видео.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {videos.map((video) => {
            const title = video.titleRu ?? video.titleKk;

            return (
              <div
                key={video.id}
                className="bg-white rounded-3xl border border-cream-dark shadow-sm overflow-hidden flex flex-col"
              >
                <div className="relative aspect-video bg-ocean/5">
                  {video.youtubeId ? (
                    // Plain img, not next/image: this is a thumbnail from YouTube's own
                    // servers, not a page image worth optimising through our own.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={youtubeThumbnailUrl(video.youtubeId)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-xs text-ocean/30">
                      файл на сайте
                    </span>
                  )}

                  {!video.isActive && (
                    <span className="absolute top-2 left-2 bg-ocean/80 text-cream text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Скрыто
                    </span>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-ocean text-sm leading-tight line-clamp-2">{title}</h3>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-cream-dark">
                    <Link
                      href={`/admin/culture-videos/${video.id}?from=${collectiveId}`}
                      className="text-xs font-semibold text-ocean hover:text-gold-dark"
                    >
                      Изменить
                    </Link>
                    <DeleteVideoButton id={video.id} title={title ?? "видео"} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
