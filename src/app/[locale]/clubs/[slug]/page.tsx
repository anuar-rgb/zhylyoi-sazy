import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import ClubApplyButton from "@/components/ClubApplyButton";
import { clubs, getClub } from "@/data/clubs";
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
    apply: string;
  }
> = {
  kk: {
    back: "Үйірмелерге оралу",
    direction: "Бағыты",
    ageRange: "Жас шегі",
    instructor: "Жетекші",
    schedule: "Сабақ кестесі",
    capacity: "Орын саны",
    apply: "Өтінім беру",
  },
  ru: {
    back: "Назад к кружкам",
    direction: "Направление",
    ageRange: "Возраст",
    instructor: "Руководитель",
    schedule: "Расписание",
    capacity: "Количество мест",
    apply: "Подать заявку",
  },
};

export function generateStaticParams() {
  return clubs.kk.map((club) => ({ slug: club.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const club = getClub(locale, slug);
  if (!club) return {};
  return { title: club.title, description: club.description };
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const club = getClub(locale, slug);

  if (!club) notFound();

  const infoRows = [
    { label: t.direction, value: club.direction },
    { label: t.ageRange, value: club.ageRange },
    { label: t.instructor, value: club.instructor },
    { label: t.schedule, value: club.schedule },
    { label: t.capacity, value: club.capacity },
  ];

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
            <div className="relative aspect-[16/9]">
              <Image
                src={club.images[0]}
                alt={club.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              <div className="absolute top-4 left-4 bg-ocean text-cream text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                {club.direction}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-ocean mb-4 leading-tight">{club.title}</h1>
              <p className="text-ocean/70 text-base sm:text-lg leading-relaxed mb-6">{club.description}</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {infoRows.map((row) => (
                  <div key={row.label} className="bg-cream/40 rounded-3xl p-4 border border-cream-dark">
                    <p className="text-xs font-semibold text-ocean/50 uppercase tracking-wide mb-0.5">{row.label}</p>
                    <p className="text-sm text-ocean font-medium">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-ocean/70 leading-relaxed border-t border-cream-dark pt-6 mb-8">
                {club.fullText.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              <ClubApplyButton
                clubTitle={club.title}
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
