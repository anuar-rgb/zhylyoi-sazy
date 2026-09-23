import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { listCultureRepertoire } from "@/lib/cultureRepertoire";
import { REPERTOIRE_CATEGORY_ADMIN_LABELS, REPERTOIRE_CATEGORY_COLORS } from "@/lib/repertoireFields";
import DeletePieceButton from "./DeletePieceButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function RepertoirePage() {
  const identity = await getStaffIdentity();

  // Without a profile RLS returns nothing, so an empty list would read as
  // "nothing added yet" when the real problem is the account setup.
  if (!identity?.hasProfile) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Репертуар</h1>
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
  const pieces = await listCultureRepertoire();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Репертуар <span className="text-ocean/40 font-normal">({pieces.length})</span>
        </h1>
        <Link href="/admin/culture-repertoire/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить произведение
        </Link>
      </div>

      {pieces.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Произведений пока нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pieces.map((piece) => {
            const title = piece.titleRu ?? piece.titleKk;

            return (
              <div key={piece.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="w-7 h-7 shrink-0 bg-ocean rounded-full grid place-items-center text-cream font-bold text-xs">
                        {piece.sortOrder}
                      </span>
                      <h2 className="font-bold text-ocean leading-tight truncate">«{title}»</h2>
                    </div>
                    <p className="text-sm text-ocean/50 truncate">{piece.authorRu ?? piece.authorKk ?? "—"}</p>
                    {piece.noteRu && <p className="text-xs text-gold-dark mt-1">{piece.noteRu}</p>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${REPERTOIRE_CATEGORY_COLORS[piece.category]}`}
                    >
                      {REPERTOIRE_CATEGORY_ADMIN_LABELS[piece.category]}
                    </span>
                    {!piece.isActive && (
                      <span className="bg-ocean/5 text-ocean/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                        Скрыто
                      </span>
                    )}
                    <Link
                      href={`/admin/culture-repertoire/${piece.id}`}
                      className="text-xs font-semibold text-ocean hover:text-gold-dark"
                    >
                      Изменить
                    </Link>
                    <DeletePieceButton id={piece.id} title={title ?? "произведение"} />
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
