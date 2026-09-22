import Image from "next/image";
import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import ClubsCarousel from "@/components/ClubsCarousel";
import { listPublicCultureClubs, localized } from "@/lib/cultureClubs";
import { applyFormLabels } from "@/data/applyFormLabels";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    active: string;
    infoLabel: string;
    prev: string;
    next: string;
    signUp: string;
    ensemble: {
      title: string;
      description: string;
      image: string;
      imagePosition?: string;
      href: string;
      linkLabel: string;
      real?: boolean;
    };
  }
> = {
  kk: {
    title: "Шығармашылық үйірмелер мен секциялар",
    subtitle: "Мәдениет үйінде әр жасқа лайық бағыттар жұмыс істейді",
    active: "Жұмыс істейді",
    infoLabel: "Ақпарат алу",
    prev: "Артқа",
    next: "Алға",
    signUp: "Жазылу",
    ensemble: {
      title: "«Жылыой сазы» фольклорлық ансамблі",
      description:
        "Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда ойнауды үйретеді. 18 кәсіби өнерпаз құрамында.",
      image: "/images/gallery/ensemble-photo.jpeg",
      imagePosition: "top",
      href: "/collectives",
      linkLabel: "Ансамбль туралы",
      real: true,
    },
  },
  ru: {
    title: "Творческие кружки и секции",
    subtitle: "В доме культуры работают направления для любого возраста",
    active: "Действует",
    infoLabel: "Узнать больше",
    prev: "Назад",
    next: "Вперёд",
    signUp: "Записаться",
    ensemble: {
      title: "Фольклорный ансамбль «Жылыой сазы»",
      description:
        "Обучение игре на домбре, кобызе, шертере и других национальных инструментах. В составе 18 профессиональных артистов.",
      image: "/images/gallery/ensemble-photo.jpeg",
      imagePosition: "top",
      href: "/collectives",
      linkLabel: "Об ансамбле",
      real: true,
    },
  },
};

export default async function ClubsSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const text = await getSiteText(locale);
  // A carousel card is a photo with a link, so a club still missing either one is
  // left to the /collectives list, which renders both cases properly.
  const carouselClubs = [
    { ...t.ensemble, title: text("clubs.ensembleTitle"), description: text("clubs.ensembleDescription") },
    ...(await listPublicCultureClubs("club")).flatMap((club) => {
      const image = club.images[0]?.url;
      if (!image || !club.slug) return [];
      return [
        {
          title: localized(club, locale, "name") ?? "",
          description: localized(club, locale, "description") ?? "",
          image,
          href: `/clubs/${club.slug}`,
          linkLabel: t.infoLabel,
        },
      ];
    }),
  ];

  return (
    <section id="clubs" className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
      <Image
        src="/images/clubs-section-background.jpg"
        alt=""
        fill
        className="object-cover -z-20 scale-110 blur-md"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-0 -z-10 bg-cream/50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("clubs.title")} subtitle={text("clubs.subtitle")} />
        </FadeIn>

        <FadeIn delay={120}>
          <ClubsCarousel
            clubs={carouselClubs}
            activeLabel={t.active}
            prevLabel={t.prev}
            nextLabel={t.next}
            signUpLabel={t.signUp}
            applyLabels={applyFormLabels[locale]}
          />
        </FadeIn>
      </div>
    </section>
  );
}
