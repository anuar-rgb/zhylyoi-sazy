import type { Metadata } from "next";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Байланыс",
  description:
    "«Жылыой сазы» ансамблімен байланысу — мекенжай, телефон, жұмыс уақыты, репетициялар кестесі. Атырау облысы, Жылыой ауданы, «Кең Жылыой» мәдениет үйі.",
};

export default function ContactsPage() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle
            title="Байланыс"
            subtitle="Бізбен хабарласыңыз"
          />
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <FadeIn>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-darkred/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-darkred mb-1">Мекенжай</h3>
                  <p className="text-darkred/70">Атырау облысы, Жылыой ауданы</p>
                  <p className="text-darkred/70">«Кең Жылыой» мәдениет үйі</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-darkred/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-darkred mb-1">Телефон</h3>
                  <p className="text-darkred/70">+7 (712) 37-XX-XX</p>
                  <p className="text-darkred/50 text-sm mt-1">Дүйсенбі – Жұма, 09:00 – 18:00</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-darkred/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-darkred mb-1">Email</h3>
                  <p className="text-darkred/70">zhylyoi.sazy@example.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-darkred/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-darkred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-darkred mb-1">Жұмыс уақыты</h3>
                  <p className="text-darkred/70">Дүйсенбі – Жұма: 09:00 – 18:00</p>
                  <p className="text-darkred/70">Сенбі: 10:00 – 15:00</p>
                  <p className="text-darkred/50 text-sm mt-1">Жексенбі — демалыс</p>
                </div>
              </div>
            </div>
          </div>
          </FadeIn>

          <FadeIn delay={150}>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-cream-dark">
              <h3 className="font-bold text-darkred text-lg mb-4">Хабарлама жіберу</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-darkred/70 mb-1">
                    Аты-жөніңіз
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-cream-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30"
                    placeholder="Есіміңізді жазыңыз"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkred/70 mb-1">
                    Телефон немесе email
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-cream-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-darkred/70 mb-1">
                    Хабарлама
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 border border-cream-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 resize-none"
                    placeholder="Хабарламаңызды жазыңыз..."
                  />
                </div>
                <button
                  type="button"
                  className="w-full bg-darkred text-cream py-3 rounded-lg font-semibold hover:bg-darkred-light transition-colors"
                >
                  Жіберу
                </button>
              </form>
            </div>

            <div className="bg-gold/10 rounded-xl p-6 border border-gold/20">
              <h3 className="font-bold text-darkred mb-2">Репетициялар кестесі</h3>
              <ul className="space-y-2 text-darkred/70 text-sm">
                <li className="flex justify-between">
                  <span>Сейсенбі, Бейсенбі</span>
                  <span className="font-medium">18:00 – 20:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Сенбі</span>
                  <span className="font-medium">10:00 – 13:00</span>
                </li>
              </ul>
              <p className="text-darkred/50 text-xs mt-3">
                * Концерт алдында қосымша репетициялар болуы мүмкін
              </p>
            </div>
          </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
