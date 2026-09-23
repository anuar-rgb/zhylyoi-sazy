import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import { listHonoredCollectives, localized } from "@/lib/cultureClubs";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Халықтық үлгілі атағы бар ұжымдар",
    description:
      "«Кең Жылыой» мәдениет үйінің халықтық атаққа ие шығармашылық ұжымдары: «Жылыой сазы» фольклорлық ансамблі және «Жастар» халықтық театры.",
  },
  ru: {
    title: "Коллективы со званием «Народный»",
    description:
      "Коллективы Дома культуры «Кен Жылыой», удостоенные почётного звания «Народный»: фольклорный ансамбль «Жылыой сазы» и народный театр «Жастар».",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const labels = {
  kk: { since: "Атақ берілген жылы", more: "Ұжым туралы толығырақ" },
  ru: { since: "Звание присвоено", more: "Подробнее о коллективе" },
} satisfies Record<Locale, unknown>;

export default async function HonoredPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const t = labels[locale];

  // Selected by the flag on the collective, never by searching its description for
  // the word: a title lost to a typo is the kind of failure nobody notices.
  const collectives = await listHonoredCollectives();

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("honoredPage.title")} subtitle={text("honoredPage.subtitle")} />
        </FadeIn>

        <FadeIn>
          <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
            {text("honoredPage.intro")}
          </p>
        </FadeIn>

        <div className="space-y-6">
          {collectives.map((collective) => {
            const title = localized(collective, locale, "name") ?? "";
            const description = localized(collective, locale, "description");
            const cover = collective.images[0]?.url;

            return (
              <FadeIn key={collective.id}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-cream-dark">
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[260px] bg-ocean/5">
                      {cover && (
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          className="object-cover"
                          style={{ objectPosition: "top" }}
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      )}
                    </div>
                    <div className="p-6 sm:p-8 flex flex-col">
                      <span className="self-start bg-gold text-ocean-dark text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                        {text("honoredPage.badge")}
                      </span>

                      <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-3 leading-tight">{title}</h2>

                      {description && (
                        <p className="text-ocean/70 text-sm sm:text-base leading-relaxed mb-4 flex-1">
                          {description}
                        </p>
                      )}

                      {/* Only when the year is known. The title can stand without it —
                          the ensemble holds it while the order has not been located. */}
                      {collective.honoredSince && (
                        <p className="text-sm text-ocean/60 mb-5">
                          <span className="text-ocean/40">{t.since}: </span>
                          <span className="font-semibold">{collective.honoredSince}</span>
                        </p>
                      )}

                      {collective.slug && (
                        <Link
                          href={`/collectives/${collective.slug}`}
                          className="btn-primary inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold self-start mt-auto"
                        >
                          {t.more}
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

        <FadeIn>
          <p className="mt-6 text-xs text-ocean/40 text-center italic">{text("honoredPage.note")}</p>
        </FadeIn>
      </div>
    </section>
  );
}
