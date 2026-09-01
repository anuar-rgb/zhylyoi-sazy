import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    active: string;
    infoLabel: string;
    clubs: {
      title: string;
      description: string;
      image: string;
      imagePosition?: string;
      href: string;
      linkLabel: string;
      real?: boolean;
    }[];
  }
> = {
  kk: {
    title: "Шығармашылық үйірмелер мен секциялар",
    subtitle: "Мәдениет үйінде әр жасқа лайық бағыттар жұмыс істейді",
    active: "Жұмыс істейді",
    infoLabel: "Ақпарат алу",
    clubs: [
      {
        title: "«Жылыой сазы» фольклорлық ансамблі",
        description:
          "Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда ойнауды үйретеді. 18 кәсіби өнерпаз құрамында.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
        href: "/about",
        linkLabel: "Ансамбль туралы",
        real: true,
      },
      {
        title: "Би үйірмесі",
        description: "Ұлттық және заманауи би өнерін меңгеруге ниет білдіретін балалар мен жасөспірімдерге арналған.",
        image: "https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg",
        href: "/contacts",
        linkLabel: "Ақпарат алу",
      },
      {
        title: "Вокал үйірмесі",
        description: "Ән айту өнерін, дауыс қою негіздерін және сахналық мәдениетті үйренуге мүмкіндік береді.",
        image: "https://images.pexels.com/photos/8815039/pexels-photo-8815039.jpeg",
        href: "/contacts",
        linkLabel: "Ақпарат алу",
      },
      {
        title: "Театр үйірмесі",
        description: "Актерлік шеберлік, сахналық сөйлеу және қойылымдарға қатысу арқылы өнерге баулиды.",
        image: "https://images.pexels.com/photos/12165875/pexels-photo-12165875.jpeg",
        href: "/contacts",
        linkLabel: "Ақпарат алу",
      },
    ],
  },
  ru: {
    title: "Творческие кружки и секции",
    subtitle: "В доме культуры работают направления для любого возраста",
    active: "Действует",
    infoLabel: "Узнать больше",
    clubs: [
      {
        title: "Фольклорный ансамбль «Жылыой сазы»",
        description:
          "Обучение игре на домбре, кобызе, шертере и других национальных инструментах. В составе 18 профессиональных артистов.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
        href: "/about",
        linkLabel: "Об ансамбле",
        real: true,
      },
      {
        title: "Танцевальный кружок",
        description: "Для детей и подростков, желающих освоить национальное и современное хореографическое искусство.",
        image: "https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg",
        href: "/contacts",
        linkLabel: "Узнать больше",
      },
      {
        title: "Вокальный кружок",
        description: "Обучение вокальному искусству, основам постановки голоса и сценической культуре.",
        image: "https://images.pexels.com/photos/8815039/pexels-photo-8815039.jpeg",
        href: "/contacts",
        linkLabel: "Узнать больше",
      },
      {
        title: "Театральный кружок",
        description: "Актёрское мастерство, сценическая речь и участие в постановках дома культуры.",
        image: "https://images.pexels.com/photos/12165875/pexels-photo-12165875.jpeg",
        href: "/contacts",
        linkLabel: "Узнать больше",
      },
    ],
  },
};

export default async function ClubsSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section id="clubs" className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {t.clubs.map((club, index) => (
            <FadeIn key={club.title} delay={index * 120}>
              <div className="group bg-white rounded-xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                <div className="relative aspect-square overflow-hidden bg-darkred/5">
                  <Image
                    src={club.image}
                    alt={club.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    style={club.imagePosition ? { objectPosition: club.imagePosition } : undefined}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {club.real && (
                    <div className="absolute bottom-3 left-3 bg-gold text-darkred text-[11px] font-semibold px-2.5 py-1 rounded-full shadow">
                      {t.active}
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-darkred text-base mb-2 leading-tight">{club.title}</h3>
                  <p className="text-darkred/70 text-sm mb-4 flex-1">{club.description}</p>
                  <Link
                    href={club.href}
                    className="text-sm font-semibold text-darkred hover:text-gold-dark transition-colors inline-flex items-center gap-1"
                  >
                    {club.linkLabel}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
