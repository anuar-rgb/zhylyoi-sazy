import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import MemberCard from "@/components/MemberCard";
import VideoCard from "@/components/VideoCard";
import FloatingBackLink from "@/components/FloatingBackLink";
import { getSiteText } from "@/lib/orgContent";
import { getPublicCultureClubBySlug, localized, paragraphs } from "@/lib/cultureClubs";
import { listPublicMembersOfClub } from "@/lib/cultureMembers";
import { listPublicRepertoireOfClub, localizedPiece } from "@/lib/cultureRepertoire";
import { REPERTOIRE_CATEGORY_COLORS, REPERTOIRE_CATEGORY_LABELS } from "@/lib/repertoireFields";
import { listPublicVideosOfClub, localizedVideo } from "@/lib/cultureVideos";
import type { Locale } from "@/i18n/routing";

/**
 * A collective's own page, built from the table.
 *
 * `/collectives/zhastar` does not come here: a static segment of that name exists
 * and Next prefers it, so the theatre keeps its hand-built page with achievements,
 * plays and posters — none of which is in the database yet. When those move, that
 * file goes and the theatre falls through to this one.
 */

const content = {
  kk: {
    honoredBadge: "Халықтық атағы бар ұжым",
    foundedLabel: "Құрылған жылы",
    honoredLabel: "«Халықтық» атағы",
    membersLabel: "Ұжым мүшесі",
    leaderLabel: "Көркемдік жетекші",
    membersTitle: "Ұжым құрамы",
    backLink: "Барлық ұжымдар",
  },
  ru: {
    honoredBadge: "Коллектив со званием «Народный»",
    foundedLabel: "Год основания",
    honoredLabel: "Звание «Народный»",
    membersLabel: "Участников",
    leaderLabel: "Художественный руководитель",
    membersTitle: "Состав коллектива",
    backLink: "Все коллективы",
  },
} satisfies Record<Locale, unknown>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const collective = await getPublicCultureClubBySlug(slug, "creative_collective");

  if (!collective) return {};

  return {
    title: localized(collective, locale, "name") ?? undefined,
    description: localized(collective, locale, "description") ?? undefined,
  };
}

export default async function CollectivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  // Scoped to this site's institution and to shown collectives by the reader, so a
  // hidden one or another institution's is simply not found.
  const collective = await getPublicCultureClubBySlug(slug, "creative_collective");
  if (!collective) notFound();

  const [members, repertoire, videos, text] = await Promise.all([
    listPublicMembersOfClub(collective.id),
    listPublicRepertoireOfClub(collective.id),
    listPublicVideosOfClub(collective.id),
    getSiteText(locale),
  ]);
  const educationLabel = text("membersPage.educationLabel");
  const videoBadge = text("videoPage.badge");

  const title = localized(collective, locale, "name") ?? "";
  const description = localized(collective, locale, "description");
  const body = paragraphs(localized(collective, locale, "fullText"));
  const cover = collective.images[0]?.url;

  const facts: { label: string; value: string }[] = [];
  if (collective.foundedYear) facts.push({ label: t.foundedLabel, value: String(collective.foundedYear) });
  if (collective.honoredSince) facts.push({ label: t.honoredLabel, value: String(collective.honoredSince) });
  if (members.length > 0) facts.push({ label: t.membersLabel, value: String(members.length) });

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <FloatingBackLink href="/collectives" label={t.backLink} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={title} subtitle={description ?? ""} />
        </FadeIn>

        {cover && (
          <FadeIn>
            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-cream-dark mb-8">
              <Image src={cover} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 960px" />
              {collective.isHonored && (
                <span className="absolute top-4 left-4 bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full">
                  {t.honoredBadge}
                </span>
              )}
            </div>
          </FadeIn>
        )}

        {facts.length > 0 && (
          <FadeIn>
            <dl className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-cream-dark text-center"
                >
                  <dd className="text-2xl sm:text-3xl font-bold text-ocean">{fact.value}</dd>
                  <dt className="text-xs sm:text-sm text-ocean/60 mt-1">{fact.label}</dt>
                </div>
              ))}
            </dl>
          </FadeIn>
        )}

        {collective.managerName && (
          <FadeIn>
            <p className="text-sm text-ocean/70 mb-8">
              <span className="text-ocean/40">{t.leaderLabel}: </span>
              <span className="font-semibold">{collective.managerName}</span>
            </p>
          </FadeIn>
        )}

        {body.length > 0 && (
          <div className="space-y-4 text-ocean/80 mb-10">
            {body.map((part, index) => (
              <FadeIn key={index}>
                <p className="leading-relaxed text-sm sm:text-base">{part}</p>
              </FadeIn>
            ))}
          </div>
        )}

        {members.length > 0 && (
          <>
            <FadeIn>
              <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-5">
                {t.membersTitle} <span className="text-ocean/40 font-normal text-base">({members.length})</span>
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
              {members.map((member, index) => (
                <FadeIn key={member.id} delay={(index % 4) * 80}>
                  <MemberCard member={member} locale={locale} educationLabel={educationLabel} />
                </FadeIn>
              ))}
            </div>
          </>
        )}

        {repertoire.length > 0 && (
          <>
            <FadeIn>
              <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-5">
                {text("repertoirePage.title")}{" "}
                <span className="text-ocean/40 font-normal text-base">({repertoire.length})</span>
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
              {repertoire.map((piece, index) => {
                const pieceTitle = localizedPiece(piece, locale, "title");
                const author = localizedPiece(piece, locale, "author");
                const note = localizedPiece(piece, locale, "note");

                return (
                  <FadeIn key={piece.id} delay={(index % 3) * 100}>
                    <div className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-all hover:-translate-y-0.5 group h-full">
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-8 h-8 bg-ocean rounded-full flex items-center justify-center text-cream font-bold text-xs">
                            {index + 1}
                          </span>
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${REPERTOIRE_CATEGORY_COLORS[piece.category]}`}
                          >
                            {REPERTOIRE_CATEGORY_LABELS[piece.category][locale]}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-ocean mb-1 leading-tight">«{pieceTitle}»</h3>
                        {author && <p className="text-ocean/60 text-sm">{author}</p>}
                        {note && (
                          <p className="mt-2 text-xs text-gold-dark bg-gold/10 inline-block px-2.5 py-1 rounded-full">
                            {note}
                          </p>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </>
        )}

        {videos.length > 0 && (
          <>
            <FadeIn>
              <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-5">
                {text("videoPage.title")} <span className="text-ocean/40 font-normal text-base">({videos.length})</span>
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {videos.map((video, index) => (
                <FadeIn key={video.id} delay={index * 100}>
                  <VideoCard
                    video={{
                      kind: video.kind,
                      youtubeId: video.youtubeId,
                      filePath: video.filePath,
                      title: localizedVideo(video, locale, "title") ?? "",
                      description: localizedVideo(video, locale, "description") ?? "",
                      venueLine: localizedVideo(video, locale, "venue") ?? "",
                      badge: videoBadge,
                    }}
                  />
                </FadeIn>
              ))}
            </div>
          </>
        )}

        <FadeIn>
          <div className="mt-10 text-center">
            <Link href="/collectives" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
              ← {t.backLink}
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
