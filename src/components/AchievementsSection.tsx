import Image from "next/image";
import FadeIn from "@/components/FadeIn";
import CountUp from "@/components/CountUp";

const stats = [
  { end: 18, suffix: "", label: "кәсіби өнерпаз" },
  { end: 10, suffix: "+", label: "репертуардағы туынды" },
  { end: 2026, suffix: "", label: "ансамбль құрылған жыл" },
];

export default function AchievementsSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-darkred text-cream overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <FadeIn>
            <div>
              <p className="text-gold font-medium tracking-wide uppercase text-xs sm:text-sm mb-3">
                Біз туралы
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5 leading-tight">
                «Кең Жылыой» мәдениет үйі
              </h2>
              <p className="text-cream/70 text-sm sm:text-base leading-relaxed mb-8">
                Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімінің
                қарамағындағы мекеме. Ғимарат қабырғасында аудан тұрғындарына арналған
                шығармашылық үйірмелер мен ансамбльдер жұмыс істейді, концерттер мен мерекелік
                іс-шаралар өткізіледі.
              </p>

              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gold">
                      <CountUp end={stat.end} suffix={stat.suffix} />
                    </div>
                    <p className="text-cream/60 text-xs sm:text-sm mt-1 leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gold/20">
              <Image
                src="/images/gallery/ensemble-photo.jpeg"
                alt="«Кең Жылыой» мәдениет үйінің ғимараты"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
