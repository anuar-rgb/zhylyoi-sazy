import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import VideoCard, { type VideoItem } from "@/components/VideoCard";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

// The recordings themselves are still listed here. Unlike the headings around them
// they are not text but files, and giving an administrator the ability to add one
// needs a table and an upload; that waits on its own migration. Everything else on
// this page is editable today.
const videos: Record<Locale, VideoItem[]> = {
  kk: [
    {
      src: "/videos/ensemble-2026.mp4",
      title: "«Жылыой сазы» фольклорлық ансамблі",
      description: "Ансамбльдің «Кең Жылыой» мәдениет үйіндегі концерттік бейнежазбасы",
      venueLine: "«Кең Жылыой» мәдениет үйі, 2026 жыл",
    },
    {
      src: "/videos/concert-2026.mp4",
      title: "Концерттік бейнежазба",
      description: "Ансамбльдің сахнадағы өнер көрсетуі",
      venueLine: "«Кең Жылыой» мәдениет үйі, 2026 жыл",
    },
  ],
  ru: [
    {
      src: "/videos/ensemble-2026.mp4",
      title: "Фольклорный ансамбль «Жылыой сазы»",
      description: "Концертная видеозапись ансамбля в доме культуры «Кен Жылыой»",
      venueLine: "Дом культуры «Кен Жылыой», 2026 год",
    },
    {
      src: "/videos/concert-2026.mp4",
      title: "Концертная видеозапись",
      description: "Выступление ансамбля на сцене",
      venueLine: "Дом культуры «Кен Жылыой», 2026 год",
    },
  ],
};

export default async function VideoPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const badge = text("videoPage.badge");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("videoPage.title")} subtitle={text("videoPage.subtitle")} />
        </FadeIn>

        <div className="space-y-8 sm:space-y-10">
          {videos[locale].map((video, index) => (
            <FadeIn key={video.src} delay={index * 150}>
              <VideoCard video={video} badge={badge} />
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <div className="mt-8 sm:mt-12 bg-ocean/5 rounded-3xl p-6 sm:p-8 text-center">
            <p className="text-ocean/70 text-base sm:text-lg">{text("videoPage.footer")}</p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
