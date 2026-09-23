import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { isPlayable, listCultureVideos } from "@/lib/cultureVideos";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import DeleteVideoButton from "./DeleteVideoButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function VideosPage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "nothing added yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Видео</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  // RLS scopes this to the viewer's institution; a platform admin sees all of them.
  const videos = await listCultureVideos();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Видео <span className="text-ocean/40 font-normal">({videos.length})</span>
        </h1>
        <Link href="/admin/culture-videos/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить видео
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Видеозаписей пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => {
            const title = video.titleRu ?? video.titleKk;

            return (
              <div key={video.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex gap-4">
                  <div className="relative w-32 sm:w-40 aspect-video shrink-0 rounded-2xl overflow-hidden bg-ocean/5">
                    {video.kind === "youtube" && video.youtubeId ? (
                      // Plain img: a thumbnail served by YouTube, not a page image
                      // worth routing through the optimiser.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={youtubeThumbnailUrl(video.youtubeId)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-xs text-ocean/30">
                        файл
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-ocean leading-tight truncate">{title}</h2>
                        <p className="text-sm text-ocean/50 line-clamp-2">{video.descriptionRu ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {video.kind === "file" && (
                          <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                            Файл в сайте
                          </span>
                        )}
                        {!isPlayable(video) && (
                          <span className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                            Нечего показать
                          </span>
                        )}
                        {!video.isActive && (
                          <span className="bg-ocean/5 text-ocean/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                            Скрыто
                          </span>
                        )}
                        <Link
                          href={`/admin/culture-videos/${video.id}`}
                          className="text-xs font-semibold text-ocean hover:text-gold-dark"
                        >
                          Изменить
                        </Link>
                        <DeleteVideoButton id={video.id} title={title ?? "видео"} />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mt-3">
                      <div className="sm:col-span-2">
                        <dt className="text-ocean/40">Место и год</dt>
                        <dd className="text-ocean/70 font-medium truncate">{video.venueRu ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Порядок</dt>
                        <dd className="text-ocean/70 font-medium">{video.sortOrder}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
