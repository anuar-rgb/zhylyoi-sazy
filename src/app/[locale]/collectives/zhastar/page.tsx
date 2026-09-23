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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {members
            .filter((m) => m.photo)
            .map((m, index) => (
              <FadeIn key={m.name} delay={index * 60}>
                <div className={`${CARD} hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col`}>
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
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <p className="font-bold text-ocean text-base sm:text-lg leading-tight mb-1">{m.name}</p>
                    {(locale === "kk" ? m.noteKk : m.noteRu) && (
                      <p className="text-gold-dark font-semibold text-xs sm:text-sm mb-2">
                        {locale === "kk" ? m.noteKk : m.noteRu}
                      </p>
                    )}
                    <div className="space-y-1.5 text-xs sm:text-sm text-ocean/60">
                      {(locale === "kk" ? m.schoolKk : m.schoolRu) && (
                        <p className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-gold shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                            />
                          </svg>
                          <span>{locale === "kk" ? m.schoolKk : m.schoolRu}</span>
                        </p>
                      )}
                      {m[locale] && (
                        <p className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-gold shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                            />
                          </svg>
                          <span>«{m[locale]}»</span>
                        </p>
                      )}
                      {(locale === "kk" ? m.levelKk : m.levelRu) && (
                        <p>
                          <span
                            className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
                              (locale === "kk" ? m.levelKk : m.levelRu) === (locale === "kk" ? "Жоғары" : "Высшее")
                                ? "bg-gold/20 text-gold-dark"
                                : "bg-ocean/10 text-ocean/70"
                            }`}
                          >
                            {t.educationLabel}: {locale === "kk" ? m.levelKk : m.levelRu}
                          </span>
                        </p>
                      )}
                    </div>
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
