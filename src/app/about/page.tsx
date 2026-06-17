import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Ансамбль туралы",
  description:
    "«Жылыой сазы» фольклорлық ансамблі 2026 жылы «Кең Жылыой» мәдениет үйінде құрылды. 18 кәсіби өнерпаз. Қазақ халқының дәстүрлі музыкалық мұрасын насихаттау.",
};

export default function AboutPage() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle
            title="Ансамбль туралы"
            subtitle="«Жылыой сазы» — Жылыой ауданының мақтанышы"
          />
        </FadeIn>

        <div className="space-y-5 sm:space-y-6 text-darkred/80">
          <FadeIn>
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <h3 className="text-lg sm:text-xl font-bold text-darkred mb-3 sm:mb-4">Құрылу тарихы</h3>
              <p className="leading-relaxed text-sm sm:text-base">
                «Жылыой сазы» фольклорлық ансамблі 2026 жылдың қаңтар айында «Кең Жылыой» мәдениет үйі
                жанынан құрылды.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <h3 className="text-lg sm:text-xl font-bold text-darkred mb-3 sm:mb-4">Негізгі мақсаты</h3>
              <p className="leading-relaxed mb-4 text-sm sm:text-base">
                Ансамбльдің негізгі мақсаты — қазақ халқының дәстүрлі музыкалық мұрасын насихаттау,
                ұлттық аспаптардың үнін кеңінен дәріптеу, халық әндері мен күйлерін жаңғырту және
                жас буынның ұлттық өнерге деген қызығушылығын арттыру.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <h3 className="text-lg sm:text-xl font-bold text-darkred mb-3 sm:mb-4">Құрамы</h3>
              <p className="leading-relaxed text-sm sm:text-base">
                Қазіргі таңда ансамбль құрамында 18 кәсіби өнерпаз қызмет етеді. Ұжым мүшелерінің
                басым бөлігі Құрманғазы атындағы Алматы мемлекеттік консерваториясы, Қазақ ұлттық өнер
                университеті, Х.Досмұхамедов атындағы Атырау университеті, Дина Нұрпейісова атындағы
                Халық музыкасы академиясы жанындағы музыкалық колледж және басқа да өнер оқу
                орындарының түлектері.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <h3 className="text-lg sm:text-xl font-bold text-darkred mb-3 sm:mb-4">Репертуары</h3>
              <p className="leading-relaxed text-sm sm:text-base">
                Ансамбль репертуарында халық әндері мен күйлері, дәстүрлі музыкалық шығармалар,
                авторлық туындылар және әлемдік классика үлгілері қамтылған.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark">
              <h3 className="text-lg sm:text-xl font-bold text-darkred mb-3 sm:mb-4">Қызмет бағыттары</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                  <span>Халық әндері мен күйлерін орындау</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                  <span>Дәстүрлі қазақ аспаптарында ойнау (домбыра, қобыз, жетіген, шертер, баян, бас-гитара, ұрмалы аспаптар)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                  <span>Аудандық, облыстық және республикалық іс-шараларға қатысу</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                  <span>Авторлық шығармаларды сахналау</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-gold rounded-full mt-2 shrink-0" />
                  <span>Ұлттық музыкалық мұраны дәріптеу</span>
                </li>
              </ul>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-cream-dark text-center">
                <div className="text-2xl sm:text-3xl font-bold text-darkred">2026</div>
                <div className="text-xs sm:text-sm text-darkred/60 mt-1">Құрылған жылы</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-cream-dark text-center">
                <div className="text-2xl sm:text-3xl font-bold text-darkred">18</div>
                <div className="text-xs sm:text-sm text-darkred/60 mt-1">Кәсіби өнерпаз</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-cream-dark text-center">
                <div className="text-2xl sm:text-3xl font-bold text-darkred">10+</div>
                <div className="text-xs sm:text-sm text-darkred/60 mt-1">Шығарма</div>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="bg-darkred/5 rounded-xl p-6 sm:p-8">
              <blockquote className="text-center italic text-darkred text-base sm:text-lg leading-relaxed">
                «Жылыой сазы» фольклорлық ансамблі аз уақыт ішінде кәсіби орындаушылардан құралған
                шығармашылық ұжым ретінде қалыптасып, ұлттық өнерді дамыту жолында жүйелі жұмыс
                жүргізуде. Ұжымның шығармашылық әлеуеті жоғары, репертуары мазмұнды және алдағы
                уақытта өңір мәдениетінің дамуына елеулі үлес қосуға дайын.
              </blockquote>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
