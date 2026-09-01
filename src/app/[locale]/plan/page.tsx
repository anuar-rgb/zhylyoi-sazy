import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Даму жоспары 2026–2028",
    description:
      "«Жылыой сазы» ансамблінің 2026–2028 жылдарға арналған даму жоспары: репертуарды кеңейту, фестивальдерге қатысу, гастрольдер, авторлық шығармалар.",
  },
  ru: {
    title: "План развития 2026–2028",
    description:
      "План развития ансамбля «Жылыой сазы» на 2026–2028 годы: расширение репертуара, участие в фестивалях, гастроли, авторские произведения.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content = {
  kk: {
    title: "Даму жоспары 2026–2028",
    subtitle: "Ансамбльді дамыту мен мойындатудың үш жылдық стратегиясы",
    strategicTitle: "Стратегиялық мақсат",
    strategicText:
      "«Жылыой сазы» ансамблі аз уақыт ішінде кәсіби орындаушылардан құралған шығармашылық ұжым ретінде қалыптасып, ұлттық өнерді дамыту жолында жүйелі жұмыс жүргізуде. Ұжымның шығармашылық әлеуеті жоғары, репертуары мазмұнды және алдағы уақытта өңір мәдениетінің дамуына елеулі үлес қосуға дайын.",
    timeline: [
      {
        title: "Репертуарды кеңейту",
        description: "Репертуарды 30 шығармаға дейін көбейту — халық әндері, күйлер, авторлық туындылар және классика үлгілері",
      },
      {
        title: "Облыстық фестивальдер",
        description: "Атырау облыстық фестивальдеріне қатысу, облыс деңгейінде ансамбльді таныту",
      },
      {
        title: "Авторлық шығармалар",
        description: "Авторлық шығармаларды сахналау — ансамбль мүшелерінің өз туындыларын орындау",
      },
      {
        title: "Гастрольдік концерттер",
        description: "Аудандық гастрольдік концерттер ұйымдастыру — Жылыой ауданының елді мекендеріне шығу",
      },
      {
        title: "Республикалық фестивальдер",
        description: "Республикалық өнер фестивальдеріне қатысу, ел деңгейінде мойындалу",
      },
      {
        title: "Ұлттық мұра жобалары",
        description: "Ұлттық музыкалық мұраны дәріптеуге бағытталған жобаларды жүзеге асыру — зерттеу, жинау, насихаттау",
      },
    ],
  },
  ru: {
    title: "План развития 2026–2028",
    subtitle: "Трёхлетняя стратегия развития и признания ансамбля",
    strategicTitle: "Стратегическая цель",
    strategicText:
      "Ансамбль «Жылыой сазы» за короткое время сформировался как творческий коллектив из профессиональных исполнителей и ведёт системную работу по развитию национального искусства. Творческий потенциал коллектива высок, репертуар содержателен, и в дальнейшем ансамбль готов внести значительный вклад в развитие культуры региона.",
    timeline: [
      {
        title: "Расширение репертуара",
        description: "Увеличение репертуара до 30 произведений — народные песни, кюи, авторские произведения и образцы классики",
      },
      {
        title: "Областные фестивали",
        description: "Участие в областных фестивалях Атырауской области, продвижение ансамбля на уровне области",
      },
      {
        title: "Авторские произведения",
        description: "Постановка авторских произведений — исполнение собственных сочинений участников ансамбля",
      },
      {
        title: "Гастрольные концерты",
        description: "Организация районных гастрольных концертов — выезды в населённые пункты Жылыойского района",
      },
      {
        title: "Республиканские фестивали",
        description: "Участие в республиканских фестивалях искусств, признание на уровне страны",
      },
      {
        title: "Проекты национального наследия",
        description: "Реализация проектов по популяризации национального музыкального наследия — исследование, сбор, продвижение",
      },
    ],
  },
} satisfies Record<Locale, unknown>;

const years = ["2026", "2026", "2027", "2027", "2028", "2028"];

export default async function PlanPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-forest via-gold to-forest/30" />

          <div className="space-y-0">
            {t.timeline.map((item, index) => (
              <FadeIn key={item.title} delay={index * 100}>
              <div className="relative pl-16 sm:pl-20 pb-10 last:pb-0 group">
                {/* Circle on line */}
                <div className="absolute left-0 sm:left-2 w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-white border-4 border-forest flex items-center justify-center z-10 group-hover:border-gold group-hover:scale-110 transition-all">
                  <span className="font-bold text-forest text-lg group-hover:text-gold transition-colors">
                    {index + 1}
                  </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-cream-dark p-6 hover:shadow-md hover:border-gold/40 transition-all">
                  {/* Year badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-cream bg-forest px-3 py-1 rounded-full">
                      {years[index]}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-forest mb-2">{item.title}</h3>
                  <p className="text-forest/60 leading-relaxed">{item.description}</p>
                </div>
              </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <FadeIn>
        <div className="mt-10 sm:mt-14 bg-gradient-to-br from-forest to-forest-dark rounded-2xl p-6 sm:p-8 lg:p-10 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4">{t.strategicTitle}</h3>
          <p className="text-cream/80 text-lg leading-relaxed max-w-2xl mx-auto">
            {t.strategicText}
          </p>
        </div>
        </FadeIn>
      </div>
    </section>
  );
}
