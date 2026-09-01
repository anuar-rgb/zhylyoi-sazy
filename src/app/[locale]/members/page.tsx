import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Құрам",
    description:
      "«Жылыой сазы» ансамблінің 18 кәсіби өнерпазы — домбырашылар, қобызшылар, баяншылар, солисттер. Қазақстанның жетекші музыкалық оқу орындарының түлектері.",
  },
  ru: {
    title: "Состав",
    description:
      "18 профессиональных артистов ансамбля «Жылыой сазы» — домбристы, кобызисты, баянисты, солисты. Выпускники ведущих музыкальных учебных заведений Казахстана.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const membersKk = [
  { name: "Лапишев Алишер Касанович", role: "Ансамбльдің көркемдік жетекшісі", education: "Құрманғазы атындағы Алматы мемлекеттік консерваториясы", specialty: "Дәстүрлі музыка өнері", level: "жоғары", photo: "/images/members/image1.jpeg" },
  { name: "Гусмадияр Эльвира Азаматқызы", role: "Прима-қобыз әртісі", education: "Х.Досмұхамедов атындағы Атырау мемлекеттік университеті", specialty: "Халық аспаптары", level: "жоғары", photo: "/images/members/image2.jpeg" },
  { name: "Саурбай Данияр Саурбайұлы", role: "Бас домбыра әртісі", education: "Батыс Қазақстан инновациялық-технологиялық университеті", specialty: "Музыкалық білім", level: "жоғары", photo: "/images/members/image3.jpeg" },
  { name: "Темірбулат Алмат Тұрланұлы", role: "Бас-гитара әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясының музыкалық колледжі", specialty: "Аспаптық орындаушылық", level: "арнаулы орта", photo: "/images/members/image4.jpeg" },
  { name: "Сатыбалды Аружан Амангелдіқызы", role: "Қыл қобыз әртісі", education: "Ақтөбе мемлекеттік гуманитарлық колледжі", specialty: "Әлеуметтік-мәдени қызмет және халықтық көркем шығармашылық", level: "арнаулы орта", photo: "/images/members/image5.jpeg" },
  { name: "Сагнаев Бекзат Асхатұлы", role: "Ұрмалы аспап әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Аспаптық орындаушылық және эстрадалық музыкалық өнер (Домбыра-бас)", level: "арнаулы орта", photo: "/images/members/image6.jpeg" },
  { name: "Ғалымжанова Альбина Ғалымжанқызы", role: "Домбыра әртісі", education: "П. Чайковский атындағы Алматы музыкалық колледжі", specialty: "Халық аспаптар оркестрінің әртісі", level: "арнаулы орта", photo: "/images/members/image7.png" },
  { name: "Аманжанова Диляра Русланқызы", role: "Домбыра әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Аспаптық орындаушылық және эстрадалық музыкалық өнер", level: "арнаулы орта", photo: "/images/members/image8.jpeg" },
  { name: "Миянова Жадыра Ербулатқызы", role: "Домбыра әртісі", education: "Құрманғазы аграрлық-техникалық колледжі", specialty: "Дәстүрлі музыка өнері", level: "арнаулы орта", photo: "/images/members/image9.jpeg" },
  { name: "Дюсенбай Айым Бисенбекқызы", role: "Домбыра әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Аспаптық орындаушылық", level: "арнаулы орта", photo: "/images/members/image10.jpeg" },
  { name: "Сайфоллаев Сәкен Асқарұлы", role: "Баян әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Аспаптық орындаушылық", level: "арнаулы орта", photo: "/images/members/image11.jpeg" },
  { name: "Салауатова Назерке Салауатқызы", role: "Баян әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Аспаптық орындаушылық", level: "арнаулы орта", photo: "/images/members/image12.jpeg" },
  { name: "Есенова Динара Адайбекқызы", role: "Жетіген әртісі", education: "Х.Досмұхамедов атындағы Атырау мемлекеттік университеті", specialty: "Халық аспаптары", level: "жоғары", photo: "/images/members/image13.jpeg" },
  { name: "Қонысбаева Айгерим Жаңабайқызы", role: "Шертер әртісі", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Оркестр әртісі", level: "арнаулы орта", photo: "/images/members/image14.jpeg" },
  { name: "Сарова Дәмелі Әукенқызы", role: "Солист", education: "Қожа Ахмет Ясауи атындағы Халықаралық қазақ-түрік университеті", specialty: "Музыкалық білім", level: "жоғары", photo: "/images/members/image15.jpeg" },
  { name: "Серік Ризабек Талғатұлы", role: "Солист", education: "Қазақ ұлттық өнер университеті", specialty: "Орындаушылық өнер", level: "жоғары", photo: "/images/members/image16.jpeg" },
  { name: "Шоқанұлы Нұртілеу", role: "Солист", education: "Д. Нұрпейісова атындағы Халық музыкасы академиясы, Атырау музыкалық колледжі", specialty: "Академиялық ән айту әртісі", level: "арнаулы орта", photo: "/images/members/image17.jpeg" },
  { name: "Амандық Сәттібек Серікұлы", role: "Солист", education: "Маңғыстау өнер колледжі", specialty: "Аспаптық орындау, музыкалық өнер эстрадасы", level: "арнаулы орта", photo: "/images/members/image18.jpeg" },
];

const membersRu = [
  { name: "Лапишев Алишер Касанович", role: "Художественный руководитель ансамбля", education: "Алматинская государственная консерватория имени Курмангазы", specialty: "Искусство традиционной музыки", level: "высшее", photo: "/images/members/image1.jpeg" },
  { name: "Гусмадияр Эльвира Азаматқызы", role: "Артист прима-кобыза", education: "Атырауский государственный университет имени Х. Досмухамедова", specialty: "Народные инструменты", level: "высшее", photo: "/images/members/image2.jpeg" },
  { name: "Саурбай Данияр Саурбайұлы", role: "Артист бас-домбры", education: "Западно-Казахстанский инновационно-технологический университет", specialty: "Музыкальное образование", level: "высшее", photo: "/images/members/image3.jpeg" },
  { name: "Темірбулат Алмат Тұрланұлы", role: "Артист бас-гитары", education: "Музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство", level: "среднее специальное", photo: "/images/members/image4.jpeg" },
  { name: "Сатыбалды Аружан Амангелдіқызы", role: "Артист кыл-кобыза", education: "Актюбинский государственный гуманитарный колледж", specialty: "Социально-культурная деятельность и народное художественное творчество", level: "среднее специальное", photo: "/images/members/image5.jpeg" },
  { name: "Сагнаев Бекзат Асхатұлы", role: "Артист ударных инструментов", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство и эстрадное музыкальное искусство (домбра-бас)", level: "среднее специальное", photo: "/images/members/image6.jpeg" },
  { name: "Ғалымжанова Альбина Ғалымжанқызы", role: "Артист домбры", education: "Алматинский музыкальный колледж имени П.И. Чайковского", specialty: "Артист оркестра народных инструментов", level: "среднее специальное", photo: "/images/members/image7.png" },
  { name: "Аманжанова Диляра Русланқызы", role: "Артист домбры", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство и эстрадное музыкальное искусство", level: "среднее специальное", photo: "/images/members/image8.jpeg" },
  { name: "Миянова Жадыра Ербулатқызы", role: "Артист домбры", education: "Курмангазинский аграрно-технический колледж", specialty: "Искусство традиционной музыки", level: "среднее специальное", photo: "/images/members/image9.jpeg" },
  { name: "Дюсенбай Айым Бисенбекқызы", role: "Артист домбры", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство", level: "среднее специальное", photo: "/images/members/image10.jpeg" },
  { name: "Сайфоллаев Сәкен Асқарұлы", role: "Артист баяна", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство", level: "среднее специальное", photo: "/images/members/image11.jpeg" },
  { name: "Салауатова Назерке Салауатқызы", role: "Артист баяна", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Инструментальное исполнительство", level: "среднее специальное", photo: "/images/members/image12.jpeg" },
  { name: "Есенова Динара Адайбекқызы", role: "Артист жетигена", education: "Атырауский государственный университет имени Х. Досмухамедова", specialty: "Народные инструменты", level: "высшее", photo: "/images/members/image13.jpeg" },
  { name: "Қонысбаева Айгерим Жаңабайқызы", role: "Артист шертера", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Артист оркестра", level: "среднее специальное", photo: "/images/members/image14.jpeg" },
  { name: "Сарова Дәмелі Әукенқызы", role: "Солист", education: "Международный казахско-турецкий университет имени Ходжи Ахмеда Ясави", specialty: "Музыкальное образование", level: "высшее", photo: "/images/members/image15.jpeg" },
  { name: "Серік Ризабек Талғатұлы", role: "Солист", education: "Казахский национальный университет искусств", specialty: "Исполнительское искусство", level: "высшее", photo: "/images/members/image16.jpeg" },
  { name: "Шоқанұлы Нұртілеу", role: "Солист", education: "Атырауский музыкальный колледж при Академии народной музыки имени Дины Нурпеисовой", specialty: "Артист академического пения", level: "среднее специальное", photo: "/images/members/image17.jpeg" },
  { name: "Амандық Сәттібек Серікұлы", role: "Солист", education: "Мангистауский колледж искусств", specialty: "Инструментальное исполнение, эстрада музыкального искусства", level: "среднее специальное", photo: "/images/members/image18.jpeg" },
];

const content = {
  kk: {
    title: "Ансамбль құрамы",
    subtitle: "18 кәсіби өнерпаз — өнер оқу орындарының түлектері",
    educationLabel: "Білімі",
    highLevel: "жоғары",
    members: membersKk,
  },
  ru: {
    title: "Состав ансамбля",
    subtitle: "18 профессиональных артистов — выпускники учебных заведений искусств",
    educationLabel: "Образование",
    highLevel: "высшее",
    members: membersRu,
  },
} satisfies Record<Locale, unknown>;

export default async function MembersPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {t.members.map((member, index) => (
            <FadeIn key={index} delay={(index % 3) * 100}>
              <div className="bg-white rounded-xl shadow-sm border border-cream-dark hover:shadow-md transition-shadow overflow-hidden h-full">
                <div className="aspect-[3/4] relative bg-forest/5">
                  {member.photo ? (
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-forest/10">
                      <span className="text-5xl font-bold text-forest/30">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-forest/80 text-cream text-xs px-2.5 py-1 rounded-full font-medium">
                    #{index + 1}
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-bold text-forest text-base sm:text-lg leading-tight mb-1">
                    {member.name}
                  </h3>
                  <p className="text-gold-dark font-semibold text-xs sm:text-sm mb-2 sm:mb-3">{member.role}</p>
                  <div className="space-y-1.5 text-xs sm:text-sm text-forest/60">
                    <p className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                      <span>{member.education}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                      </svg>
                      <span>«{member.specialty}»</span>
                    </p>
                    <p>
                      <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
                        member.level === t.highLevel
                          ? "bg-gold/20 text-gold-dark"
                          : "bg-forest/10 text-forest/70"
                      }`}>
                        {t.educationLabel}: {member.level}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
