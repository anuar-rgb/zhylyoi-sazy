import Image from "next/image";
import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureNews } from "@/lib/cultureNews";
import { PUBLISH_STATUS_LABELS, PUBLISH_STATUS_STYLE } from "@/lib/publishStatus";
import { formatEventDateTime } from "@/lib/eventFields";
import DeleteNewsButton from "./DeleteNewsButton";
import BackToDashboard from "../BackToDashboard";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function CultureNewsPage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "no news yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToDashboard />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Новости</h1>
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
  const items = await listCultureNews();

  return (
    <div>
      <BackToDashboard />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Новости <span className="text-ocean/40 font-normal">({items.length})</span>
        </h1>
        <Link href="/admin/culture-news/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить новость
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Новостей пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className={`${CARD} p-4 sm:p-5`}>
              <div className="flex gap-4">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-ocean/5">
                  {item.images[0] ? (
                    <Image src={item.images[0].url} alt="" fill className="object-cover" sizes="96px" unoptimized />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-xs text-ocean/30">нет фото</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-bold text-ocean leading-tight">{item.titleRu ?? item.titleKk}</h2>
                      <p className="text-sm text-ocean/50 truncate">{item.titleKk}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${PUBLISH_STATUS_STYLE[item.status]}`}>
                        {PUBLISH_STATUS_LABELS[item.status]}
                      </span>
                      <Link
                        href={`/admin/culture-news/${item.id}`}
                        className="text-xs font-semibold text-ocean hover:text-gold-dark"
                      >
                        Изменить
                      </Link>
                      <DeleteNewsButton id={item.id} title={item.titleRu ?? item.titleKk ?? "новость"} />
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                    <div>
                      <dt className="text-ocean/40">Дата</dt>
                      <dd className="text-ocean/70 font-medium">{formatEventDateTime(item.publishedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-ocean/40">Метка</dt>
                      <dd className="text-ocean/70 font-medium truncate">{item.tagRu ?? item.tagKk ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-ocean/40">Адрес</dt>
                      <dd className="text-ocean/70 font-medium truncate">{item.slug ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-ocean/40">Фото</dt>
                      <dd className="text-ocean/70 font-medium">{item.images.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
