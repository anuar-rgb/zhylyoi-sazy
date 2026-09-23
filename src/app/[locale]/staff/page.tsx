import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Қызметкерлер",
    description: "«Кең Жылыой» Жылыой аудандық мәдениет үйінің басшылығы мен қызметкерлері.",
  },
  ru: {
    title: "Сотрудники",
    description: "Руководство и сотрудники Дома культуры «Кен Жылыой» Жылыойского района.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const staffKk = [
  { name: "Темирханов Алибек Жумаханович", role: "Басшысы", photo: null as string | null },
];

const staffRu = [
  { name: "Темирханов Алибек Жумаханович", role: "Директор", photo: null as string | null },
];

const content = {
  kk: {
    title: "Қызметкерлер",
    subtitle: "«Кең Жылыой» мәдениет үйінің басшылығы мен қызметкерлері",
    staff: staffKk,
  },
  ru: {
    title: "Сотрудники",
    subtitle: "Руководство и сотрудники Дома культуры «Кен Жылыой»",
    staff: staffRu,
  },
} satisfies Record<Locale, unknown>;

export default async function StaffPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const text = await getSiteText(locale);

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("staffPage.title")} subtitle={text("staffPage.subtitle")} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {t.staff.map((person, index) => (
            <FadeIn key={index} delay={index * 100}>
              <div className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-shadow overflow-hidden h-full">
                <div className="aspect-square relative bg-ocean/5 flex items-center justify-center">
                  <span className="text-6xl font-bold text-ocean/30">
                    {person.name.charAt(0)}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-bold text-ocean text-base sm:text-lg leading-tight mb-1">
                    {person.name}
                  </h3>
                  <p className="text-gold-dark font-semibold text-xs sm:text-sm">{person.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
