import Image from "next/image";
import Link from "next/link";
import type { CultureMemberRecord } from "@/lib/cultureMembers";
import DeleteMemberButton from "../culture-members/DeleteMemberButton";

/**
 * The collective's roster, as cards, on the collective's own page.
 *
 * The general Состав ансамбля section still exists and still works; this is the
 * same people reached the other way round. Editing the theatre means opening the
 * theatre, not scrolling one list of thirty-four for the sixteen that belong to it.
 *
 * Every link carries ?from=<collective>, so saving or cancelling comes back here
 * instead of landing in that general list.
 */
export default function RosterCards({
  collectiveId,
  members,
}: {
  collectiveId: string;
  members: CultureMemberRecord[];
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-ocean">
          Состав <span className="text-ocean/40 font-normal text-base">({members.length})</span>
        </h2>
        <Link
          href={`/admin/culture-members/new?club=${collectiveId}`}
          className="btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          Добавить артиста
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
          <p className="text-ocean/60">В этом коллективе пока никого нет.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {members.map((member) => {
            const name = member.nameRu ?? member.nameKk;
            const photo = member.images[0];

            return (
              <div
                key={member.id}
                className="bg-white rounded-3xl border border-cream-dark shadow-sm overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-ocean/5">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 220px"
                      unoptimized
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-3xl font-bold text-ocean/20">
                      {name?.charAt(0) ?? "?"}
                    </span>
                  )}

                  {!member.isActive && (
                    <span className="absolute top-2 left-2 bg-ocean/80 text-cream text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Скрыт
                    </span>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-ocean text-sm leading-tight">{name}</h3>
                  <p className="text-xs text-ocean/50 mt-0.5 line-clamp-2">
                    {member.roleRu ?? member.roleKk ?? "—"}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-cream-dark">
                    <Link
                      href={`/admin/culture-members/${member.id}?from=${collectiveId}`}
                      className="text-xs font-semibold text-ocean hover:text-gold-dark"
                    >
                      Изменить
                    </Link>
                    <DeleteMemberButton id={member.id} name={name ?? "артист"} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-ocean/40 mt-3">
        Порядок артистов задаётся числом в карточке каждого. Артисты из других коллективов сюда не попадают —
        общий список всех есть в разделе «Состав ансамбля».
      </p>
    </section>
  );
}
