import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import SectionTitle from "@/components/SectionTitle";
import type { Locale } from "@/i18n/routing";

const videos = [
  { poster: "/images/gallery/video-poster-ensemble.jpg", href: "/video" },
  { poster: "/images/gallery/video-poster-concert.jpg", href: "/video" },
];

const galleryPhotos = [
  "/images/members/image2.jpeg",
  "/images/members/image5.jpeg",
  "/images/members/image11.jpeg",
  "/images/members/image9.jpeg",
  "/images/members/image18.jpeg",
  "/images/members/image13.jpeg",
];

const content: Record<
  Locale,
  { title: string; subtitle: string; videoLabel: string; watchAll: string; photoLabel: string; seeAll: string }
> = {
  kk: {
    title: "Бейне және фотогалерея",
    subtitle: "Ансамбльдің концерттері мен өнерпаздарынан үзінділер",
    videoLabel: "Бейне",
    watchAll: "Барлық бейнелер",
    photoLabel: "Фотогалерея",
    seeAll: "Құрамды толық көру",
  },
  ru: {
    title: "Видео и фотогалерея",
    subtitle: "Кадры с концертов и артистов ансамбля",
    videoLabel: "Видео",
    watchAll: "Все видео",
    photoLabel: "Фотогалерея",
    seeAll: "Смотреть весь состав",
  },
};

export default async function GalleryPreviewSection() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-cream/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Videos */}
          <FadeIn className="lg:col-span-2">
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
                {videos.map((video, index) => (
                  <Link
                    key={index}
                    href={video.href}
                    className="group relative rounded-xl overflow-hidden shadow-sm border border-cream-dark bg-black aspect-[9/16] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <Image
                      src={video.poster}
                      alt={t.videoLabel}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 1024px) 45vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gold/90 group-hover:bg-gold flex items-center justify-center transition-all group-hover:scale-110 shadow-xl">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-darkred ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/video"
                className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-darkred hover:text-gold-dark transition-colors"
              >
                {t.watchAll}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>

          {/* Photo gallery */}
          <FadeIn delay={150} className="lg:col-span-3">
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-3 gap-3 sm:gap-4 flex-1">
                {galleryPhotos.map((photo, index) => (
                  <div
                    key={photo}
                    className="group relative rounded-xl overflow-hidden shadow-sm border border-cream-dark aspect-square hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <Image
                      src={photo}
                      alt={t.photoLabel}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 15vw"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
              <Link
                href="/members"
                className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-darkred hover:text-gold-dark transition-colors"
              >
                {t.seeAll}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
