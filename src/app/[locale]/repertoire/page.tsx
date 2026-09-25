import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import FloatingBackLink from "@/components/FloatingBackLink";
import { getSiteText } from "@/lib/orgContent";
import { listPublicCultureRepertoire, localizedPiece } from "@/lib/cultureRepertoire";
import {
  REPERTOIRE_CATEGORY_COLORS,
  REPERTOIRE_CATEGORY_LABELS,
  type RepertoireCategory,
} from "@/lib/repertoireFields";
import type { Locale } from "@/i18n/routing";

const homeLabel: Record<Locale, string> = { kk: "Басты бет", ru: "Главная" };

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Репертуар",
    description:
      "«Жылыой сазы» ансамблінің репертуары: халық әндері мен күйлері, дәстүрлі шығармалар, авторлық туындылар және әлемдік классика.",
  },
  ru: {
    title: "Репертуар",
    description:
      "Репертуар ансамбля «Жылыой сазы»: народные песни и кюи, традиционные произведения, авторские сочинения и мировая классика.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

export default async function RepertoirePage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const pieces = await listPublicCultureRepertoire();

  // Counted by category code, not by the displayed word: two spellings of the same
  // category would otherwise split into two columns of the summary.
  const byCategory = pieces.reduce<Partial<Record<RepertoireCategory, number>>>((acc, piece) => {
    acc[piece.category] = (acc[piece.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <FloatingBackLink href="/" label={homeLabel[locale]} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("repertoirePage.title")} subtitle={text("repertoirePage.subtitle")} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {pieces.map((piece, index) => {
            const title = localizedPiece(piece, locale, "title");
            const author = localizedPiece(piece, locale, "author");
            const note = localizedPiece(piece, locale, "note");

            return (
              <FadeIn key={piece.id} delay={(index % 3) * 100}>
                <div className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-9 h-9 bg-ocean rounded-full flex items-center justify-center text-cream font-bold text-sm">
                        {index + 1}
                      </span>
                      {/* Both the word and the colour come from the stored code, so
                          they cannot disagree and a rename cannot lose the colour. */}
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${REPERTOIRE_CATEGORY_COLORS[piece.category]}`}
                      >
                        {REPERTOIRE_CATEGORY_LABELS[piece.category][locale]}
                      </span>
                    </div>

                    <div className="mb-3">
                      <svg
                        className="w-8 h-8 text-gold/60 group-hover:text-gold transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    </div>

                    <h3 className="text-xl font-bold text-ocean mb-1 leading-tight">«{title}»</h3>
                    {author && <p className="text-ocean/60 text-sm">{author}</p>}
                    {note && (
                      <p className="mt-2 text-xs text-gold-dark bg-gold/10 inline-block px-2.5 py-1 rounded-full">
                        {note}
                      </p>
                    )}
                  </div>

                  <div className="h-1 bg-gradient-to-r from-ocean via-gold to-ocean opacity-20 group-hover:opacity-60 transition-opacity" />
                </div>
              </FadeIn>
            );
          })}
        </div>

        {pieces.length > 0 && (
          <FadeIn>
            <div className="mt-8 sm:mt-12 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <div className="flex flex-wrap justify-center gap-6 text-center">
                {Object.entries(byCategory).map(([category, count]) => (
                  <div key={category} className="px-4">
                    <div className="text-2xl font-bold text-ocean">{count}</div>
                    <div className="text-sm text-ocean/50">
                      {REPERTOIRE_CATEGORY_LABELS[category as RepertoireCategory][locale]}
                    </div>
                  </div>
                ))}
                <div className="px-4 border-l-2 border-gold/30">
                  <div className="text-2xl font-bold text-gold-dark">{pieces.length}</div>
                  <div className="text-sm text-ocean/50">{text("repertoirePage.total")}</div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        <div className="mt-4 sm:mt-6 text-center text-ocean/50 text-sm">{text("repertoirePage.footer")}</div>
      </div>
    </section>
  );
}
