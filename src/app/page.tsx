import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-darkred text-cream overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(201,168,76,0.15) 35px, rgba(201,168,76,0.15) 70px)`,
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <FadeIn>
              <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-3 sm:mb-4">
                «Кең Жылыой» мәдениет үйі
              </p>
            </FadeIn>
            <FadeIn delay={100}>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                <span className="text-gold">Жылыой сазы</span>
                <br />
                фольклорлық ансамблі
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-base sm:text-xl text-cream/80 mb-6 sm:mb-8 max-w-2xl leading-relaxed">
                Қазақ халқының бай музыкалық мұрасын сақтау, дамыту және келер ұрпаққа жеткізу — біздің басты мақсатымыз. Ансамбль 18 талантты орындаушыдан тұрады.
              </p>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 bg-gold text-darkred font-semibold rounded-lg hover:bg-gold-light active:scale-95 transition-all text-base sm:text-lg"
                >
                  Толығырақ
                </Link>
                <Link
                  href="/video"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 border-2 border-gold text-gold font-semibold rounded-lg hover:bg-gold hover:text-darkred active:scale-95 transition-all text-base sm:text-lg"
                >
                  Бейнелер
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* About cards */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-darkred mb-3">Біз туралы</h2>
              <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <FadeIn delay={0}>
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark text-center h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-darkred/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-darkred mb-2">Халық әндері</h3>
                <p className="text-darkred/70 text-sm sm:text-base">Қазақ халқының көне дәстүрлі әндері мен күйлерін орындаймыз</p>
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark text-center h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-darkred/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-darkred mb-2">18 орындаушы</h3>
                <p className="text-darkred/70 text-sm sm:text-base">Тәжірибелі музыканттар мен жас таланттар бірге өнер көрсетеді</p>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-cream-dark text-center h-full sm:col-span-2 lg:col-span-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-darkred/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-darkred mb-2">Жылыой ауданы</h3>
                <p className="text-darkred/70 text-sm sm:text-base">Атырау облысының мәдени өмірін байытуға үлес қосамыз</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-darkred/5 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-darkred mb-4">
              Бізбен бірге халық музыкасын тыңдаңыз
            </h2>
            <p className="text-darkred/70 mb-6 sm:mb-8 text-base sm:text-lg">
              Концерт кестесі мен байланыс ақпаратын біздің сайттан таба аласыз
            </p>
            <Link
              href="/contacts"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 bg-darkred text-cream font-semibold rounded-lg hover:bg-darkred-light active:scale-95 transition-all text-base sm:text-lg"
            >
              Байланысу
            </Link>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
