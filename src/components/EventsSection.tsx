import Image from "next/image";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";

const events = [
  {
    date: "20 қыркүйек",
    time: "19:00",
    title: "Мерекелік концерт",
    description: "Қазақ халық әндері мен күйлерінің кеші, ұлттық аспаптар сүйемелдеуімен",
    image: "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg",
  },
  {
    date: "4 қазан",
    time: "18:00",
    title: "Балалар театр спектаклі",
    description: "Ауданның жас көрермендеріне арналған қойылым",
    image: "https://images.pexels.com/photos/6896181/pexels-photo-6896181.jpeg",
  },
  {
    date: "15 қазан",
    time: "11:00",
    title: "Қолөнер және сурет көрмесі",
    description: "Өңір шеберлері мен балалар шығармашылық үйірмелерінің жұмыстары",
    image: "https://images.pexels.com/photos/2559741/pexels-photo-2559741.jpeg",
  },
];

export default function EventsSection() {
  return (
    <section id="afisha" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title="Афиша" subtitle="Жақын арадағы іс-шаралар" />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {events.map((event, index) => (
            <FadeIn key={event.title} delay={index * 120}>
              <div className="group bg-cream/40 rounded-xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 bg-darkred text-cream text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg shadow">
                    {event.date}
                  </div>
                  <div className="absolute top-3 right-3 bg-gold text-darkred text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg shadow">
                    {event.time}
                  </div>
                </div>
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-darkred text-lg mb-2">{event.title}</h3>
                  <p className="text-darkred/70 text-sm mb-4 flex-1">{event.description}</p>
                  <Link
                    href="/contacts"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-darkred text-cream text-sm font-semibold rounded-lg hover:bg-darkred-light active:scale-95 transition-all"
                  >
                    Толығырақ
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
