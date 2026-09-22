import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { getPublicCultureEventBySlug } from "@/lib/cultureEvents";
import { buildIcsDataUri, toEventView } from "@/lib/eventView";
import type { Locale } from "@/i18n/routing";

const WHATSAPP_PHONE_DIGITS = "77789276387";

const content: Record<
  Locale,
  {
    back: string;
    location: string;
    organizer: string;
    addToCalendar: string;
    register: string;
    waIntro: string;
  }
> = {
  kk: {
    back: "Афишаға оралу",
    location: "Өтетін орны",
    organizer: "Ұйымдастырушы",
    addToCalendar: "Күнтізбеге қосу",
    register: "Тіркелу",
    waIntro: "Сәлеметсіз бе! Мына іс-шараға тіркелгім келеді",
  },
  ru: {
    back: "Назад к афише",
    location: "Место проведения",
    organizer: "Организатор",
    addToCalendar: "Добавить в календарь",
    register: "Записаться",
    waIntro: "Здравствуйте! Хочу записаться на мероприятие",
  },
};

// No generateStaticParams here on purpose: events are created and edited in the
// admin panel, so the page is rendered per request. One added today appears
// without a rebuild, and one that was deleted stops resolving immediately.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const record = await getPublicCultureEventBySlug(slug);
  if (!record) return {};
  const event = toEventView(record, locale);
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
  const record = await getPublicCultureEventBySlug(slug);

  if (!record) notFound();

  const event = toEventView(record, locale);

  const waMessage = `${t.waIntro} «${event.title}» (${event.date}, ${event.time}).`;
  const waHref = `https://wa.me/${WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(waMessage)}`;
  const icsHref = buildIcsDataUri(event);

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
            <div className="relative aspect-[16/9] bg-ocean/5">
              {event.image && (
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              )}
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

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3 bg-cream/40 rounded-3xl p-4 border border-cream-dark">
                  <svg className="w-5 h-5 text-gold-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-0.5">{t.location}</p>
                    <p className="text-sm text-ocean font-medium">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-cream/40 rounded-3xl p-4 border border-cream-dark">
                  <svg className="w-5 h-5 text-gold-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-0.5">{t.organizer}</p>
                    <p className="text-sm text-ocean font-medium">{event.organizer}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-ocean/70 leading-relaxed border-t border-cream-dark pt-6">
                {event.fullText.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm font-semibold"
                >
                  {t.register}
                </a>
                <a
                  href={icsHref}
                  download={`${event.slug}.ics`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-[20px] border-2 border-ocean/20 text-ocean hover:border-ocean/40 hover:bg-cream/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t.addToCalendar}
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
