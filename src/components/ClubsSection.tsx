import Image from "next/image";
import { getLocale } from "next-intl/server";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import ClubsCarousel from "@/components/ClubsCarousel";
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
    clubs: [
      {
        title: "«Жылыой сазы» фольклорлық ансамблі",
        description:
          "Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда ойнауды үйретеді. 18 кәсіби өнерпаз құрамында.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
        href: "/collectives",
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
      {
        title: "ИЗО және қолөнер үйірмесі",
        description: "Сурет салу, кескіндеме және қолөнер негіздерін үйрете отырып, балалардың шығармашылық қиялын дамытады.",
        image: "https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg",
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
    clubs: [
      {
        title: "Фольклорный ансамбль «Жылыой сазы»",
        description:
          "Обучение игре на домбре, кобызе, шертере и других национальных инструментах. В составе 18 профессиональных артистов.",
        image: "/images/gallery/ensemble-photo.jpeg",
        imagePosition: "top",
        href: "/collectives",
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
      {
        title: "Кружок ИЗО и творчества",
        description: "Рисование, живопись и основы декоративно-прикладного искусства для развития творческого мышления детей.",
        image: "https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg",
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
            clubs={t.clubs}
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
