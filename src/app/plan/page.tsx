import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Даму жоспары 2026–2028",
  description:
    "«Жылыой сазы» ансамблінің 2026–2028 жылдарға арналған даму жоспары: репертуарды кеңейту, фестивальдерге қатысу, гастрольдер, авторлық шығармалар.",
};

const timeline = [
  {
    num: 1,
    title: "Репертуарды кеңейту",
    description: "Репертуарды 30 шығармаға дейін көбейту — халық әндері, күйлер, авторлық туындылар және классика үлгілері",
  },
  {
    num: 2,
    title: "Облыстық фестивальдер",
    description: "Атырау облыстық фестивальдеріне қатысу, облыс деңгейінде ансамбльді таныту",
  },
  {
    num: 3,
    title: "Авторлық шығармалар",
    description: "Авторлық шығармаларды сахналау — ансамбль мүшелерінің өз туындыларын орындау",
  },
  {
    num: 4,
    title: "Гастрольдік концерттер",
    description: "Аудандық гастрольдік концерттер ұйымдастыру — Жылыой ауданының елді мекендеріне шығу",
  },
  {
    num: 5,
    title: "Республикалық фестивальдер",
    description: "Республикалық өнер фестивальдеріне қатысу, ел деңгейінде мойындалу",
  },
  {
    num: 6,
    title: "Ұлттық мұра жобалары",
    description: "Ұлттық музыкалық мұраны дәріптеуге бағытталған жобаларды жүзеге асыру — зерттеу, жинау, насихаттау",
  },
];

export default function PlanPage() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle
            title="Даму жоспары 2026–2028"
            subtitle="Ансамбльді дамыту мен мойындатудың үш жылдық стратегиясы"
          />
        </FadeIn>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-darkred via-gold to-darkred/30" />

          <div className="space-y-0">
            {timeline.map((item, index) => (
              <FadeIn key={item.num} delay={index * 100}>
              <div className="relative pl-16 sm:pl-20 pb-10 last:pb-0 group">
                {/* Circle on line */}
                <div className="absolute left-0 sm:left-2 w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-white border-4 border-darkred flex items-center justify-center z-10 group-hover:border-gold group-hover:scale-110 transition-all">
                  <span className="font-bold text-darkred text-lg group-hover:text-gold transition-colors">
                    {item.num}
                  </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-cream-dark p-6 hover:shadow-md hover:border-gold/40 transition-all">
                  {/* Year badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-cream bg-darkred px-3 py-1 rounded-full">
                      {index < 2 ? "2026" : index < 4 ? "2027" : "2028"}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-darkred mb-2">{item.title}</h3>
                  <p className="text-darkred/60 leading-relaxed">{item.description}</p>
                </div>
              </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <FadeIn>
        <div className="mt-10 sm:mt-14 bg-gradient-to-br from-darkred to-darkred-dark rounded-2xl p-6 sm:p-8 lg:p-10 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gold mb-4">Стратегиялық мақсат</h3>
          <p className="text-cream/80 text-lg leading-relaxed max-w-2xl mx-auto">
            «Жылыой сазы» ансамблі аз уақыт ішінде кәсіби орындаушылардан құралған шығармашылық
            ұжым ретінде қалыптасып, ұлттық өнерді дамыту жолында жүйелі жұмыс жүргізуде.
            Ұжымның шығармашылық әлеуеті жоғары, репертуары мазмұнды және алдағы уақытта
            өңір мәдениетінің дамуына елеулі үлес қосуға дайын.
          </p>
        </div>
        </FadeIn>
      </div>
    </section>
  );
}
