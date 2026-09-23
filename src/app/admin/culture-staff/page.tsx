import Image from "next/image";
import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureStaff } from "@/lib/cultureStaff";
import DeleteStaffButton from "./DeleteStaffButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

/** Initials stand in for a missing photo, so a card without one is still a person. */
function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function StaffPage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "nobody added yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Сотрудники</h1>
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
  const people = await listCultureStaff();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Сотрудники <span className="text-ocean/40 font-normal">({people.length})</span>
        </h1>
        <Link href="/admin/culture-staff/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить сотрудника
        </Link>
      </div>

      {people.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Сотрудников пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {people.map((person) => {
            const name = person.nameRu ?? person.nameKk;

            return (
              <div key={person.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-ocean/5">
                    {person.images[0] ? (
                      <Image
                        src={person.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-lg font-bold text-ocean/25">
                        {initials(name)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-ocean leading-tight">{name}</h2>
                        <p className="text-sm text-ocean/50 truncate">{person.roleRu ?? person.roleKk ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {person.isActive ? (
                          <span className="bg-gold/15 text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                            На сайте
                          </span>
                        ) : (
                          <span className="bg-ocean/5 text-ocean/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                            Скрыт
                          </span>
                        )}
                        <Link
                          href={`/admin/culture-staff/${person.id}`}
                          className="text-xs font-semibold text-ocean hover:text-gold-dark"
                        >
                          Изменить
                        </Link>
                        <DeleteStaffButton id={person.id} name={name ?? "сотрудник"} />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                      <div>
                        <dt className="text-ocean/40">Порядок</dt>
                        <dd className="text-ocean/70 font-medium">{person.sortOrder}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Телефон</dt>
                        <dd className="text-ocean/70 font-medium truncate">{person.phone ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Почта</dt>
                        <dd className="text-ocean/70 font-medium truncate">{person.email ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Фото</dt>
                        <dd className="text-ocean/70 font-medium">{person.images.length}</dd>
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
