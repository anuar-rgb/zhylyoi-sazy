import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listHalls } from "@/lib/halls";
import DeleteHallButton from "./DeleteHallButton";
import BackToSettings from "./BackToSettings";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function HallsPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToSettings />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Залы</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const halls = await listHalls();

  return (
    <div>
      <BackToSettings />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Залы <span className="text-ocean/40 font-normal">({halls.length})</span>
        </h1>
        <Link href="/admin/settings/halls/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить зал
        </Link>
      </div>

      <p className="text-sm text-ocean/60 mb-6">
        Залы и сетка мест — первый шаг продажи билетов. Сами билеты, бронь и оплата появятся отдельно.
      </p>

      {halls.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Залов пока нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {halls.map((hall) => {
            const name = hall.nameRu ?? hall.nameKk ?? "Без названия";

            return (
              <div key={hall.id} className={`${CARD} p-4 sm:p-5 flex items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <h2 className="font-bold text-ocean truncate">{name}</h2>
                  <p className="text-sm text-ocean/50">
                    {hall.totalCapacity} {hall.totalCapacity === 1 ? "место" : "мест"}
                    {!hall.isActive && <span className="text-ocean/40"> · не используется</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/settings/halls/${hall.id}`}
                    className="text-xs font-semibold text-ocean border border-cream-dark rounded-full px-3 py-1.5 hover:bg-cream hover:text-gold-dark transition-colors"
                  >
                    Изменить
                  </Link>
                  <DeleteHallButton id={hall.id} name={name} seatCount={hall.totalCapacity} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
