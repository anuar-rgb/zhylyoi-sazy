import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { listPublicCultureClubs, localized } from "@/lib/cultureClubs";
import { listPublicCultureMembers } from "@/lib/cultureMembers";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Ұжымдар",
    description:
      "«Кең Жылыой» мәдениет үйінде жұмыс істейтін шығармашылық ұжымдар: «Жылыой сазы» фольклорлық ансамблі, «Жастар» халықтық театры, би, вокал, театр және ИЗО үйірмелері.",
  },
  ru: {
    title: "Коллективы",
    description:
      "Творческие коллективы Дома культуры «Кен Жылыой»: фольклорный ансамбль «Жылыой сазы», народный театр «Жастар», танцевальный, вокальный, театральный и ИЗО кружки.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content = {
  kk: {
    title: "Ұжымдар",
    subtitle: "Мәдениет үйінде жұмыс істейтін шығармашылық ұжымдар мен үйірмелер",
    honoredBadge: "Халықтық атағы бар ұжым",
    foundedLabel: "Құрылған жылы",
    honoredLabel: "«Халықтық» атағы",
    membersLabel: "Ұжым мүшесі",
    leaderLabel: "Көркемдік жетекші",
    othersTitle: "Басқа да үйірмелер",
    infoLabel: "Ақпарат алу",
  },
  ru: {
    title: "Коллективы",
    subtitle: "Творческие коллективы и кружки Дома культуры",
    honoredBadge: "Коллектив со званием «Народный»",
    foundedLabel: "Год основания",
    honoredLabel: "Звание «Народный»",
    membersLabel: "Участников",
    leaderLabel: "Художественный руководитель",
    othersTitle: "Другие кружки",
    infoLabel: "Узнать больше",
  },
} satisfies Record<Locale, unknown>;

export default async function CollectivesPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  const [collectives, clubs, members] = await Promise.all([
    listPublicCultureClubs("creative_collective"),
    listPublicCultureClubs("club"),
    listPublicCultureMembers(),
  ]);

  // Counted once here rather than queried per collective: the roster list is
  // memoized for the render pass, so this costs nothing extra.
  const memberCount = new Map<string, number>();
  for (const member of members) {
    if (member.clubId) memberCount.set(member.clubId, (memberCount.get(member.clubId) ?? 0) + 1);
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        {/* Both collectives are drawn the same way. The ensemble used to have a
            hand-written card of its own and the theatre another; with the two of
            them in one table there is no reason for either to be a special case. */}
        <div className="space-y-6 sm:space-y-8 mb-12 sm:mb-16">
          {collectives.map((collective) => {
            const title = localized(collective, locale, "name") ?? "";
            const description = localized(collective, locale, "description");
            const cover = collective.images[0]?.url;
            const count = memberCount.get(collective.id) ?? 0;

            const facts: { label: string; value: string }[] = [];
            if (collective.foundedYear) {
              facts.push({ label: t.foundedLabel, value: String(collective.foundedYear) });
            }
            if (collective.honoredSince) {
              facts.push({ label: t.honoredLabel, value: String(collective.honoredSince) });
            }
            if (count > 0) facts.push({ label: t.membersLabel, value: String(count) });

            return (
              <FadeIn key={collective.id}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-cream-dark">
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[280px] bg-ocean/5">
                      {cover && (
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      )}
                    </div>

                    <div className="p-6 sm:p-8 flex flex-col">
                      {collective.isHonored && (
                        <span className="self-start bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                          {t.honoredBadge}
                        </span>
                      )}

                      <h3 className="text-xl sm:text-2xl font-bold text-ocean mb-3 leading-tight">{title}</h3>

                      {description && (
                        <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-5">{description}</p>
                      )}

                      {facts.length > 0 && (
                        <dl className="grid grid-cols-3 gap-3 mb-5">
                          {facts.map((fact) => (
                            <div key={fact.label}>
                              <dd className="text-xl sm:text-2xl font-bold text-ocean">{fact.value}</dd>
                              <dt className="text-xs text-ocean/50 leading-tight">{fact.label}</dt>
                            </div>
                          ))}
                        </dl>
                      )}

                      {collective.managerName && (
                        <p className="text-sm text-ocean/60 mb-5">
                          <span className="text-ocean/40">{t.leaderLabel}: </span>
                          {collective.managerName}
                        </p>
                      )}

                      {/* A collective without an address has no page of its own. */}
                      {collective.slug && (
                        <Link
                          href={`/collectives/${collective.slug}`}
                          className="btn-primary inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold self-start mt-auto"
                        >
                          {t.infoLabel}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        {clubs.length > 0 && (
          <>
            <FadeIn>
              <h3 className="text-xl sm:text-2xl font-bold text-ocean mb-6">{t.othersTitle}</h3>
            </FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {clubs.map((club, index) => {
                const title = localized(club, locale, "name") ?? "";
                const description = localized(club, locale, "description");
                const cover = club.images[0]?.url;

                return (
                  <FadeIn key={club.id} delay={index * 100}>
                    <div className="group bg-white rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                      <div className="relative aspect-square overflow-hidden bg-ocean/5">
                        {cover && (
                          <Image
                            src={cover}
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        )}
                      </div>
                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        <h4 className="font-bold text-ocean text-base mb-2 leading-tight">{title}</h4>
                        {description && <p className="text-ocean/70 text-sm mb-4 flex-1">{description}</p>}
                        {club.slug && (
                          <Link
                            href={`/clubs/${club.slug}`}
                            className="text-sm font-semibold text-ocean hover:text-gold-dark transition-colors inline-flex items-center gap-1 mt-auto"
                          >
                            {t.infoLabel}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
