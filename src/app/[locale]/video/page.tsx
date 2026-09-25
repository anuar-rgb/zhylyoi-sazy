import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import VideoCard from "@/components/VideoCard";
import FloatingBackLink from "@/components/FloatingBackLink";
import { getSiteText } from "@/lib/orgContent";
import { listPublicCultureVideos, localizedVideo } from "@/lib/cultureVideos";
import type { Locale } from "@/i18n/routing";

const homeLabel: Record<Locale, string> = { kk: "Басты бет", ru: "Главная" };

export default async function VideoPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const videos = await listPublicCultureVideos();
  const badge = text("videoPage.badge");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <FloatingBackLink href="/" label={homeLabel[locale]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("videoPage.title")} subtitle={text("videoPage.subtitle")} />
        </FadeIn>

        <div className="space-y-8 sm:space-y-10">
          {videos.map((video, index) => (
            <FadeIn key={video.id} delay={index * 150}>
              <VideoCard
                video={{
                  kind: video.kind,
                  youtubeId: video.youtubeId,
                  filePath: video.filePath,
                  title: localizedVideo(video, locale, "title") ?? "",
                  description: localizedVideo(video, locale, "description") ?? "",
                  venueLine: localizedVideo(video, locale, "venue") ?? "",
                  badge,
                }}
              />
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
