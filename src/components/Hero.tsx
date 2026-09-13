import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  { eyebrow: string; titleGold: string; titleCream: string; subtitle: string; afisha: string; about: string; scroll: string }
> = {
  kk: {
    eyebrow: "«Кең Жылыой» мәдениет үйі",
    titleGold: "Жылыой сазы",
    titleCream: "фольклорлық ансамблі",
    subtitle: "Қазақ халқының бай музыкалық мұрасын сақтау, дамыту және келер ұрпаққа жеткізу",
    afisha: "Афиша",
    about: "Ансамбль туралы",
    scroll: "Төмен айналдыру",
  },
  ru: {
    eyebrow: "Дом культуры «Кен Жылыой»",
    titleGold: "Жылыой сазы",
    titleCream: "фольклорный ансамбль",
    subtitle: "Сохранение, развитие и передача будущим поколениям богатого музыкального наследия казахского народа",
    afisha: "Афиша",
    about: "Об ансамбле",
    scroll: "Прокрутить вниз",
  },
};

export default async function Hero() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="relative bg-black overflow-hidden">
      <div className="relative w-full h-[100svh] lg:h-[85vh]">
        <Image
          src="/images/hero-building-illustration.jpg"
          alt={t.eyebrow}
          fill
          priority
          className="object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-12 pb-20 sm:pb-16 lg:pb-20">
          <div className="max-w-3xl">
            <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3 animate-fade-in">
              {t.eyebrow}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-5 leading-tight text-white animate-fade-in-delay-1">
              <span className="text-gold">{t.titleGold}</span>
              <br />
              <span className="text-cream">{t.titleCream}</span>
            </h1>
            <p className="text-sm sm:text-lg lg:text-xl text-white/70 mb-5 sm:mb-7 max-w-xl leading-relaxed animate-fade-in-delay-2">
              {t.subtitle}
            </p>
            <div className="flex flex-col items-start sm:flex-row gap-3 animate-fade-in-delay-3">
              <a
                href="#afisha"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 bg-gold text-ocean font-semibold rounded-lg hover:bg-gold-light active:scale-95 transition-all text-base sm:text-lg"
              >
                {t.afisha}
              </a>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 active:scale-95 transition-all text-base sm:text-lg"
              >
                {t.about}
              </Link>
            </div>
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
