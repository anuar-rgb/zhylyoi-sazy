import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import ClubApplyButton from "@/components/ClubApplyButton";
import { getPublicClubBySlug, localized, paragraphs } from "@/lib/clubs";
import { applyFormLabels } from "@/data/applyFormLabels";
import type { Locale } from "@/i18n/routing";

const content: Record<
  Locale,
  {
    back: string;
    direction: string;
    ageRange: string;
    instructor: string;
    schedule: string;
    capacity: string;
    phone: string;
    apply: string;
    gallery: string;
  }
> = {
  kk: {
    back: "Үйірмелерге оралу",
    direction: "Бағыты",
    ageRange: "Жас шегі",
    instructor: "Жетекші",
    schedule: "Сабақ кестесі",
    capacity: "Орын саны",
    phone: "Байланыс телефоны",
    apply: "Өтінім беру",
    gallery: "Фотосуреттер",
  },
  ru: {
    back: "Назад к кружкам",
    direction: "Направление",
    ageRange: "Возраст",
    instructor: "Руководитель",
    schedule: "Расписание",
    capacity: "Количество мест",
    phone: "Телефон",
    apply: "Подать заявку",
    gallery: "Фотографии",
  },
};

// No generateStaticParams here on purpose: clubs are created and edited in the admin
// panel, so the page is rendered per request. A club added today appears without a
// rebuild, and one that was deleted stops resolving immediately.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const club = await getPublicClubBySlug(slug);
  if (!club) return {};

  return {
    title: localized(club, locale, "name") ?? undefined,
    description: localized(club, locale, "description") ?? undefined,
  };
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const club = await getPublicClubBySlug(slug);

  if (!club) notFound();

  const title = localized(club, locale, "name") ?? "";
  const description = localized(club, locale, "description");
  const direction = localized(club, locale, "direction");
  const body = paragraphs(localized(club, locale, "fullText"));
  const [cover, ...rest] = club.images;

  // Unfilled fields are dropped rather than shown as "to be confirmed": the
  // institution adds them from the admin panel once it knows them.
  const infoRows = [
    { label: t.direction, value: direction },
    { label: t.ageRange, value: club.ageRange },
    { label: t.instructor, value: club.managerName },
    { label: t.schedule, value: localized(club, locale, "schedule") },
    { label: t.capacity, value: club.capacity === null ? null : String(club.capacity) },
    { label: t.phone, value: club.contactPhone },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <Link
            href="/collectives"
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
            {cover && (
              <div className="relative aspect-[16/9]">
                <Image
                  src={cover.url}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
                {direction && (
                  <div className="absolute top-4 left-4 bg-ocean text-cream text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                    {direction}
                  </div>
                )}
              </div>
            )}

            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-ocean mb-4 leading-tight">{title}</h1>
              {description && (
                <p className="text-ocean/70 text-base sm:text-lg leading-relaxed mb-6">{description}</p>
              )}

              {infoRows.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {infoRows.map((row) => (
                    <div key={row.label} className="bg-cream/40 rounded-3xl p-4 border border-cream-dark">
                      <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-0.5">{row.label}</p>
                      <p className="text-sm text-ocean font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {body.length > 0 && (
                <div className="space-y-4 text-ocean/70 leading-relaxed border-t border-cream-dark pt-6 mb-8">
                  {body.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}

              {rest.length > 0 && (
                <div className="border-t border-cream-dark pt-6 mb-8">
                  <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-3">{t.gallery}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {rest.map((image) => (
                      <div key={image.url} className="relative aspect-square rounded-2xl overflow-hidden bg-ocean/5">
                        <Image
                          src={image.url}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 240px"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ClubApplyButton
                clubTitle={title}
                triggerLabel={t.apply}
                triggerClassName="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm font-semibold"
                {...applyFormLabels[locale]}
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
