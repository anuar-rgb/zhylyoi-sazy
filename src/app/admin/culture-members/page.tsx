import Image from "next/image";
import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureMembers } from "@/lib/cultureMembers";
import { listCultureClubs } from "@/lib/cultureClubs";
import DeleteMemberButton from "./DeleteMemberButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function MembersPage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "nobody added yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Состав ансамбля</h1>
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
  const [members, collectives] = await Promise.all([
    listCultureMembers(),
    listCultureClubs("creative_collective"),
  ]);

  // Names by id, so each card can say which collective it belongs to without a
  // lookup per row.
  const collectiveName = new Map(collectives.map((c) => [c.id, c.nameRu ?? c.nameKk ?? "Коллектив"]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Состав ансамбля <span className="text-ocean/40 font-normal">({members.length})</span>
        </h1>
        <Link href="/admin/culture-members/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить артиста
        </Link>
      </div>

      {members.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Артистов пока нет.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) => {
            const name = member.nameRu ?? member.nameKk;

            return (
              <div key={member.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex gap-4">
                  <div className="relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-ocean/5">
                    {member.images[0] ? (
                      <Image
                        src={member.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-lg font-bold text-ocean/25">
                        {name?.charAt(0) ?? "?"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-ocean leading-tight">{name}</h2>
                        <p className="text-sm text-ocean/50 truncate">{member.roleRu ?? member.roleKk ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {member.hasHigherEducation && (
                          <span className="bg-gold/20 text-gold-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                            Высшее
                          </span>
                        )}
                        {member.isActive ? (
                          <span className="bg-gold/15 text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                            На сайте
                          </span>
                        ) : (
                          <span className="bg-ocean/5 text-ocean/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                            Скрыт
                          </span>
                        )}
                        <Link
                          href={`/admin/culture-members/${member.id}`}
                          className="text-xs font-semibold text-ocean hover:text-gold-dark"
                        >
                          Изменить
                        </Link>
                        <DeleteMemberButton id={member.id} name={name ?? "артист"} />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                      <div>
                        <dt className="text-ocean/40">Коллектив</dt>
                        <dd
                          className={`font-medium truncate ${member.clubId ? "text-ocean/70" : "text-amber-700"}`}
                        >
                          {member.clubId ? (collectiveName.get(member.clubId) ?? "—") : "без коллектива"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Учебное заведение</dt>
                        <dd className="text-ocean/70 font-medium truncate">{member.educationRu ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Уровень</dt>
                        <dd className="text-ocean/70 font-medium truncate">{member.levelRu ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ocean/40">Порядок</dt>
                        <dd className="text-ocean/70 font-medium">{member.sortOrder}</dd>
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
