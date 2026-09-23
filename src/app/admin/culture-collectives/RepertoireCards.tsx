import Link from "next/link";
import type { CultureRepertoireRecord } from "@/lib/cultureRepertoire";
import { REPERTOIRE_CATEGORY_ADMIN_LABELS } from "@/lib/repertoireFields";
import DeletePieceButton from "../culture-repertoire/DeletePieceButton";

/**
 * A collective's repertoire, as cards, on the collective's own page.
 *
 * The general Репертуар section still exists and still works; this is the same
 * pieces reached the other way round. Every link carries ?from=<collective>, so
 * saving or cancelling comes back here instead of landing in the general list.
 */
export default function RepertoireCards({
  collectiveId,
  pieces,
}: {
  collectiveId: string;
  pieces: CultureRepertoireRecord[];
}) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-ocean">
          Репертуар <span className="text-ocean/40 font-normal text-base">({pieces.length})</span>
        </h2>
        <Link
          href={`/admin/culture-repertoire/new?club=${collectiveId}`}
          className="btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          Добавить произведение
        </Link>
      </div>

      {pieces.length === 0 ? (
        <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-8 text-center">
          <p className="text-ocean/60">У этого коллектива пока нет репертуара.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pieces.map((piece) => {
            const title = piece.titleRu ?? piece.titleKk;
            const author = piece.authorRu ?? piece.authorKk;

            return (
              <div
                key={piece.id}
                className="bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-5 flex items-center gap-4"
              >
                <span className="shrink-0 text-xs font-semibold text-ocean/40 bg-cream/50 rounded-full px-3 py-1">
                  {REPERTOIRE_CATEGORY_ADMIN_LABELS[piece.category]}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ocean truncate">«{title}»</p>
                  {author && <p className="text-xs text-ocean/50 truncate">{author}</p>}
                </div>

                {!piece.isActive && (
                  <span className="shrink-0 bg-ocean/5 text-ocean/50 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    Скрыто
                  </span>
                )}

                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    href={`/admin/culture-repertoire/${piece.id}?from=${collectiveId}`}
                    className="text-xs font-semibold text-ocean hover:text-gold-dark"
                  >
                    Изменить
                  </Link>
                  <DeletePieceButton id={piece.id} title={title ?? "произведение"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
