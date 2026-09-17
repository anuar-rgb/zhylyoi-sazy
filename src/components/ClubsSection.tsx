import Image from "next/image";
import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import ClubsCarousel from "@/components/ClubsCarousel";
import { clubs } from "@/data/clubs";
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
    modalHeading: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    submitLabel: string;
    cancelLabel: string;
    waIntro: string;
    waNameLabel: string;
    waPhoneLabel: string;
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
    modalHeading: "Үйірмеге жазылу",
    nameLabel: "Аты-жөніңіз",
    namePlaceholder: "Атыңызды жазыңыз",
    phoneLabel: "Телефон нөмірі",
    phonePlaceholder: "+7 (___) ___-__-__",
    submitLabel: "WhatsApp арқылы жіберу",
    cancelLabel: "Болдырмау",
    waIntro: "Сәлеметсіз бе! Мені {club} бағыты бойынша жазуды сұраймын.",
    waNameLabel: "Аты-жөні",
    waPhoneLabel: "Телефон",
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
    modalHeading: "Запись в кружок",
    nameLabel: "Ваше имя",
    namePlaceholder: "Введите имя",
    phoneLabel: "Номер телефона",
    phonePlaceholder: "+7 (___) ___-__-__",
    submitLabel: "Отправить через WhatsApp",
    cancelLabel: "Отмена",
    waIntro: "Здравствуйте! Прошу записать меня в направление {club}.",
    waNameLabel: "Имя",
    waPhoneLabel: "Телефон",
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
  const carouselClubs = [
    t.ensemble,
    ...clubs[locale].map((c) => ({
      title: c.title,
      description: c.description,
      image: c.images[0],
      href: `/clubs/${c.slug}`,
      linkLabel: t.infoLabel,
    })),
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
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <FadeIn delay={120}>
          <ClubsCarousel
            clubs={carouselClubs}
            activeLabel={t.active}
            prevLabel={t.prev}
            nextLabel={t.next}
            signUpLabel={t.signUp}
            modalHeading={t.modalHeading}
            nameLabel={t.nameLabel}
            namePlaceholder={t.namePlaceholder}
            phoneLabel={t.phoneLabel}
            phonePlaceholder={t.phonePlaceholder}
            submitLabel={t.submitLabel}
            cancelLabel={t.cancelLabel}
            waIntro={t.waIntro}
            waNameLabel={t.waNameLabel}
            waPhoneLabel={t.waPhoneLabel}
          />
        </FadeIn>
      </div>
    </section>
  );
}
