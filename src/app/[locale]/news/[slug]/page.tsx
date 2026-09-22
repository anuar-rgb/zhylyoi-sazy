import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import ShareButtons from "@/components/ShareButtons";
import { getPublicCultureNewsBySlug } from "@/lib/cultureNews";
import { toNewsView } from "@/lib/newsView";
import type { Locale } from "@/i18n/routing";

/** Share links need an absolute URL; deriving it from the request keeps the domain out of the source. */
async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const content: Record<Locale, { back: string; shareLabel: string; copyLabel: string; copiedLabel: string }> = {
  kk: {
    back: "Жаңалықтарға оралу",
    shareLabel: "Бөлісу",
    copyLabel: "Сілтемені көшіру",
    copiedLabel: "Көшірілді",
  },
  ru: {
    back: "Назад к новостям",
    shareLabel: "Поделиться",
    copyLabel: "Скопировать ссылку",
    copiedLabel: "Скопировано",
  },
};

// No generateStaticParams here on purpose: news is written in the admin panel,
// so the page is rendered per request. An item published today appears without a
// rebuild, and one that was deleted stops resolving immediately.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const record = await getPublicCultureNewsBySlug(slug);
  if (!record) return {};
  const item = toNewsView(record, locale);
  return { title: item.title, description: item.excerpt };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const record = await getPublicCultureNewsBySlug(slug);

  if (!record) notFound();

  const item = toNewsView(record, locale);

  const localePrefix = locale === "ru" ? "/ru" : "";
  const pageUrl = `${await getSiteUrl()}${localePrefix}/news/${item.slug}`;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean/70 hover:text-gold-dark transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            {t.back}
          </Link>
        </FadeIn>

        <FadeIn>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-cream-dark">
            <div className="relative aspect-[16/9] bg-ocean/5">
              {/* News without a photo renders the placeholder background instead of crashing. */}
              {item.images[0] && (
                <Image
                  src={item.images[0]}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              )}
              <div className="absolute top-4 left-4 bg-gold text-ocean-dark text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                {item.tag}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-ocean/50 text-sm font-medium mb-2">{item.date}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-ocean mb-4 leading-tight">{item.title}</h1>
              <p className="text-ocean/70 text-base sm:text-lg leading-relaxed mb-6">{item.excerpt}</p>

              <div className="space-y-4 text-ocean/70 leading-relaxed border-t border-cream-dark pt-6 mb-8">
                {item.fullText.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {item.images.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {item.images.slice(1).map((src) => (
                    <div key={src} className="relative aspect-square rounded-3xl overflow-hidden border border-cream-dark">
                      <Image src={src} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                    </div>
                  ))}
                </div>
              )}

              <ShareButtons
                url={pageUrl}
                title={item.title}
                label={t.shareLabel}
                copyLabel={t.copyLabel}
                copiedLabel={t.copiedLabel}
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
