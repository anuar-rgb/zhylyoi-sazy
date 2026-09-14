import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { events, getEvent } from "@/data/events";
import type { Locale } from "@/i18n/routing";

const content: Record<Locale, { back: string; contact: string }> = {
  kk: { back: "Афишаға оралу", contact: "Хабарласу" },
  ru: { back: "Назад к афише", contact: "Связаться с нами" },
};

export function generateStaticParams() {
  return events.kk.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const event = getEvent(locale, slug);
  if (!event) return {};
  return { title: event.title, description: event.description };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const event = getEvent(locale, slug);

  if (!event) notFound();

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <Link
            href="/afisha"
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
            <div className="relative aspect-[16/9]">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              <div className="absolute top-4 left-4 bg-ocean text-cream text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                {event.date}
              </div>
              <div className="absolute top-4 right-4 bg-gold text-ocean text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                {event.time}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-ocean mb-4 leading-tight">
                {event.title}
              </h1>
              <p className="text-ocean/70 text-base sm:text-lg leading-relaxed mb-6">
                {event.description}
              </p>

              <div className="space-y-4 text-ocean/70 leading-relaxed border-t border-cream-dark pt-6">
                {event.fullText.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              <Link
                href="/contacts"
                className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm font-semibold mt-8"
              >
                {t.contact}
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
