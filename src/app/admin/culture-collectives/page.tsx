import Image from "next/image";
import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureClubs } from "@/lib/cultureClubs";
import { listCultureMembers } from "@/lib/cultureMembers";
import DeleteCollectiveButton from "./DeleteCollectiveButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function CollectivesPage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "nothing added yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Коллективы</h1>
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
  const [collectives, members] = await Promise.all([
    listCultureClubs("creative_collective"),
    listCultureMembers(),
  ]);

  const memberCount = new Map<string, number>();
  for (const member of members) {
    if (member.clubId) memberCount.set(member.clubId, (memberCount.get(member.clubId) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Коллективы <span className="text-ocean/40 font-normal">({collectives.length})</span>
        </h1>
        <Link href="/admin/culture-collectives/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить коллектив
        </Link>
      </div>

      <p className="text-sm text-ocean/60 mb-6">
        Творческие коллективы учреждения — ансамбли, театры. Кружки живут отдельно, на дашборде.
      </p>

      {collectives.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Коллективов пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collectives.map((collective) => {
            const name = collective.nameRu ?? collective.nameKk;
            const count = memberCount.get(collective.id) ?? 0;

            return (
              <div key={collective.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex gap-4">
                  <div className="relative w-28 sm:w-36 aspect-video shrink-0 rounded-2xl overflow-hidden bg-ocean/5">
                    {collective.images[0] ? (
                      <Image
                        src={collective.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="144px"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-xs text-ocean/30">
                        нет фото
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* The two halves never wrap past each other: a long name used to
                        push the buttons onto a line of their own, leaving the corner
                        where every other card keeps them empty — which reads as a
                        card that cannot be edited at all. The badges wrap instead,
                        under the name, where moving costs nothing. */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-ocean leading-tight">{name}</h2>
                        <p className="text-sm text-ocean/50 truncate">
                          {collective.directionRu ?? collective.directionKk ?? "—"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {collective.isHonored && (
                            <span className="bg-gold/20 text-gold-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                              Народный
                            </span>
                          )}
                          {collective.isActive ? (
                            <span className="bg-gold/15 text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                              На сайте
                            </span>
                          ) : (
                            <span className="bg-ocean/5 text-ocean/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                              Скрыт
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/culture-collectives/${collective.id}`}
                          className="text-xs font-semibold text-ocean border border-cream-dark rounded-full px-3 py-1.5 hover:bg-cream hover:text-gold-dark transition-colors"
                        >
                          Изменить
                        </Link>
                        <DeleteCollectiveButton
                          id={collective.id}
                          name={name ?? "коллектив"}
                          memberCount={count}
                        />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                      <div>
                        <dt className="text-ocean/40">Артистов</dt>
                        <dd className="text-ocean/70 font-medium">{count || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Основан</dt>
                        <dd className="text-ocean/70 font-medium">{collective.foundedYear ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Звание с</dt>
                        <dd className="text-ocean/70 font-medium">{collective.honoredSince ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Адрес</dt>
                        <dd className="text-ocean/70 font-medium truncate">{collective.slug ?? "—"}</dd>
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
