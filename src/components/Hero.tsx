import { getImageProps } from "next/image";
import { getLocale } from "next-intl/server";
import { getSiteText } from "@/lib/orgContent";
import { CONTENT_DEFAULTS } from "@/lib/siteContent";
import { getSiteOrganization, siteBrand } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

// The title, subtitle and eyebrow are the institution's own texts (Тексты сайта → Первый экран).
const content: Record<Locale, { afisha: string; about: string; scroll: string; imageAlt: (name: string) => string }> = {
  kk: { afisha: "Афиша", about: "Біз туралы", scroll: "Төмен айналдыру", imageAlt: (name) => `${name} ғимараты` },
  ru: { afisha: "Афиша", about: "О нас", scroll: "Прокрутить вниз", imageAlt: (name) => `Здание: ${name}` },
};

export default async function Hero() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const text = await getSiteText(locale);
  const organization = await getSiteOrganization();
  const brand = organization ? siteBrand(organization, locale) : null;
  const imageAlt = t.imageAlt(brand?.fullName ?? "");
  // The title's first line is the institution's short name unless its own text says otherwise. With
  // no short name either, the full name stands alone: it already says «дом культуры», so the built-in
  // second line would repeat it.
  const ownTitle = text("hero.titleGold");
  const hasShortName = Boolean(organization && (organization.shortNameKk || organization.shortNameRu));
  const titleGold = ownTitle || (brand ? (hasShortName ? `«${brand.name}»` : brand.fullName) : "");
  const secondLine = text("hero.titleCream");
  const titleCream = !ownTitle && !hasShortName && secondLine === CONTENT_DEFAULTS["hero.titleCream"][locale] ? "" : secondLine;

  // The institution's own picture (Настройки), wide and upright; the upright one falls back to the
  // wide one. The sizes only shape the srcset: object-cover fits any picture to the screen.
  const desktopSrc = organization?.heroImageUrl ?? null;
  const mobileSrc = organization?.heroImageMobileUrl ?? desktopSrc;
  const common = { alt: imageAlt, sizes: "100vw", quality: 80 };
  const desktopSrcSet = desktopSrc ? getImageProps({ ...common, width: 2752, height: 1536, src: desktopSrc }).props.srcSet : undefined;
  const mobile = mobileSrc ? getImageProps({ ...common, width: 1536, height: 2752, src: mobileSrc }).props : null;

  return (
    <section className="relative bg-black overflow-hidden">
      <div className="relative w-full h-[100svh] lg:h-[85vh]">
        {mobile ? (
          <picture>
            <source media="(min-width: 1024px)" srcSet={desktopSrcSet} />
            <source media="(max-width: 1023px)" srcSet={mobile.srcSet} />
            <img {...{ ...mobile, srcSet: undefined }} alt={imageAlt} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
        ) : (
          // No picture yet (a new institution): the site's own colours.
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-dark via-ocean to-ocean-light" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between sm:justify-end p-5 sm:p-8 lg:p-12 pt-16 sm:pt-8 lg:pt-12 pb-24 sm:pb-16 lg:pb-20">
          <div className="max-w-3xl">
            <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3 animate-fade-in">
              {text("hero.eyebrow")}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-5 leading-tight text-white animate-fade-in-delay-1">
              <span className="text-gold">{titleGold}</span>
              {titleCream && (
                <>
                  <br />
                  <span className="text-cream">{titleCream}</span>
                </>
              )}
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-white/70 sm:mb-7 max-w-xl leading-relaxed animate-fade-in-delay-2">
              {text("hero.subtitle")}
            </p>
          </div>

          <div className="flex flex-col items-start sm:flex-row gap-3 max-w-3xl animate-fade-in-delay-3">
            <a
              href="#afisha"
              className="btn-primary inline-flex items-center justify-center px-6 sm:px-8 py-3 border-2 border-transparent font-semibold text-base sm:text-lg"
            >
              {t.afisha}
            </a>
            <a
              href="#about-us"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-[20px] border-2 border-white/40 text-white font-semibold hover:bg-white/10 active:scale-95 transition-all text-base sm:text-lg"
            >
              {t.about}
            </a>
          </div>
        </div>

        {/* Scroll down indicator */}
        <a
          href="#afisha"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 hover:text-white animate-bounce transition-colors"
          aria-label={t.scroll}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
