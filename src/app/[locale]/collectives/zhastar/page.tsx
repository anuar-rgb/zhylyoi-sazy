import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";
import {
  achievements,
  content,
  leader,
  members,
  posters,
  repertoire,
  videos,
} from "@/data/teatr";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "«Жастар» халықтық театры",
    description:
      "1957 жылы құрылған, 2008 жылдан «Халықтық» атағын иеленген «Кең Жылыой» мәдениет үйінің театр ұжымы: тарихы, жетістіктері, құрамы және репертуары.",
  },
  ru: {
    title: "Народный театр «Жастар»",
    description:
      "Театральный коллектив Дома культуры «Кен Жылыой»: основан в 1957 году, со званием «Народный» с 2008 года. История, достижения, состав и репертуар.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function ZhastarPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        {/* Lead card: badge, summary, the three figures that define the collective */}
        <FadeIn>
          <div className={`${CARD} overflow-hidden mb-8`}>
            <div className="relative aspect-[16/9]">
              <Image
                src={posters[3].src}
                alt={t.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
              />
            </div>
            <div className="p-6 sm:p-8">
              <span className="inline-block bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                {t.badge}
              </span>
              <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-6">{t.lead}</p>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                {t.stats.map((s) => (
                  <div key={s.label} className="bg-cream/40 rounded-3xl px-3 py-4 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-ocean">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-ocean/60 mt-1 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-ocean/60">
                {t.leaderLabel}: <span className="font-semibold text-ocean">{leader}</span>
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="space-y-4 text-ocean/70 text-sm sm:text-base leading-relaxed mb-10">
            {t.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </FadeIn>

        {/* Achievements, oldest first — the list reads as a history */}
        <FadeIn>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">{t.achievementsTitle}</h2>
          <ol className="space-y-3 mb-10">
            {achievements.map((a, i) => (
              <li key={i} className={`${CARD} p-4 sm:p-5 flex gap-4`}>
                <span className="text-gold-dark font-bold text-sm shrink-0 w-12">{a.year}</span>
                <span className="text-ocean/70 text-sm leading-relaxed">{a[locale]}</span>
              </li>
            ))}
          </ol>
        </FadeIn>

        <FadeIn>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">{t.repertoireTitle}</h2>
          <p className="text-xs text-ocean/50 mb-4">{repertoire.length}</p>
          <div className={`${CARD} p-5 sm:p-6 mb-10`}>
            <ol className="space-y-2.5">
              {repertoire.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-ocean/30 font-semibold w-6 shrink-0 text-right">{i + 1}</span>
                  <span className="text-ocean font-medium">«{p.title}»</span>
                  <span className="text-ocean/50">— {p.author}</span>
                </li>
              ))}
            </ol>
          </div>
        </FadeIn>

        <FadeIn>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">{t.postersTitle}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {posters.slice(0, 3).map((p) => (
              <figure key={p.src} className={`${CARD} overflow-hidden`}>
                <div className="relative aspect-[4/3]">
                  <Image
                    src={p.src}
                    alt={p[locale]}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <figcaption className="px-4 py-3 text-xs text-ocean/60 leading-snug">{p[locale]}</figcaption>
              </figure>
            ))}
          </div>
        </FadeIn>

        {/* Portraits and education published at the institution's request. Two members
            have no card in the source packet and fall through to the plain list below. */}
        <FadeIn>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-1">{t.membersTitle}</h2>
          <p className="text-xs text-ocean/50 mb-4">{t.membersNote}</p>
        </FadeIn>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {members
            .filter((m) => m.photo)
            .map((m, index) => (
              <FadeIn key={m.name} delay={index * 60}>
                <div className={`${CARD} overflow-hidden h-full flex flex-col`}>
                  <div className="relative aspect-[3/4] bg-ocean/5">
                    <Image
                      src={m.photo as string}
                      alt={m.name}
                      fill
                      className="object-cover"
                      style={{ objectPosition: "top" }}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                    />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-sm font-bold text-ocean leading-snug">{m.name}</p>
                    {(locale === "kk" ? m.noteKk : m.noteRu) && (
                      <p className="text-[11px] text-gold-dark font-semibold mt-1 leading-snug">
                        {locale === "kk" ? m.noteKk : m.noteRu}
                      </p>
                    )}
                    {m[locale] && <p className="text-xs text-ocean/70 mt-1.5 leading-snug">{m[locale]}</p>}
                    {(locale === "kk" ? m.levelKk : m.levelRu) && (
                      <p className="text-[11px] text-ocean/45 mt-2 leading-snug">
                        {t.educationLabel}: {locale === "kk" ? m.levelKk : m.levelRu}
                      </p>
                    )}
                    {(locale === "kk" ? m.schoolKk : m.schoolRu) && (
                      <p className="text-[11px] text-ocean/45 leading-snug">
                        {locale === "kk" ? m.schoolKk : m.schoolRu}
                      </p>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
        </div>

        {members.some((m) => !m.photo) && (
          <FadeIn>
            <div className={`${CARD} p-5 sm:p-6 mb-10`}>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {members
                  .filter((m) => !m.photo)
                  .map((m) => (
                    <li key={m.name} className="text-sm font-medium text-ocean">
                      {m.name}
                    </li>
                  ))}
              </ul>
            </div>
          </FadeIn>
        )}

        <FadeIn>
          <h2 className="text-lg sm:text-xl font-bold text-ocean mb-4">{t.videosTitle}</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-10">
            {videos.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CARD} px-5 py-4 text-sm font-semibold text-ocean hover:shadow-md transition-shadow flex items-center justify-between gap-3`}
              >
                <span>
                  {t.videosLink} #{i + 1}
                </span>
                <svg className="w-4 h-4 text-ocean/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </FadeIn>

        <FadeIn>
          <Link
            href="/collectives"
            className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold"
          >
            {t.backLink}
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
