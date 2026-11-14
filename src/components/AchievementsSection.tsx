import Image from "next/image";
import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import CountUp from "@/components/CountUp";
import { getSiteText, splitStat } from "@/lib/orgContent";
import { listPublicCultureMembers } from "@/lib/cultureMembers";
import { getSiteOrganization, siteBrand } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

export default async function AchievementsSection() {
  const locale = (await getLocale()) as Locale;
  const [text, members, organization] = await Promise.all([getSiteText(locale), listPublicCultureMembers(), getSiteOrganization()]);
  // The block's title is the institution's full name unless its own text says otherwise.
  const title = text("about.title") || (organization ? siteBrand(organization, locale).fullName : "");
  const picture = organization?.heroImageUrl ?? null;

  // The first figure is the one visitors can actually check against the site
  // itself — the roster pages — so it counts real artists instead of carrying a
  // number someone typed once and never updated when new people joined. The second
  // stays free text: repertoire size is not derived from any single table here.
  // Цифра вводится как она выглядит — «10+» — а счётчику нужны отдельно число и
  // приписка.
  const stats = [
    { end: members.length, suffix: "", label: text("about.stat1Label") },
    { ...splitStat(text("about.stat2Value")), label: text("about.stat2Label") },
  ];

  return (
    <section id="about-us" className="py-12 sm:py-16 lg:py-20 bg-ocean text-cream overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two columns with the institution's picture; the text alone otherwise, not beside an empty half. */}
        <div className={`grid grid-cols-1 gap-10 lg:gap-16 items-center ${picture ? "lg:grid-cols-2" : "max-w-3xl"}`}>
          <FadeIn>
            <div>
              <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-3">
                {text("about.eyebrow")}
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5 leading-tight">
                {title}
              </h2>
              <p className="text-cream/70 text-sm sm:text-base leading-relaxed mb-8">
                {text("about.description")}
              </p>

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gold">
                      <CountUp end={stat.end} suffix={stat.suffix} />
                    </div>
                    <p className="text-cream/60 text-xs sm:text-sm mt-1 leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {picture && (
          <FadeIn delay={150}>
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gold/20">
              <Image
                src={picture}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
          )}
        </div>
      </div>
    </section>
  );
}
