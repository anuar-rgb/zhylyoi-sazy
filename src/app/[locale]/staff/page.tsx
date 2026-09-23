import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import { listPublicCultureStaff, localizedStaff } from "@/lib/cultureStaff";
import { telHref } from "@/lib/contactLinks";
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

/** Initials stand in for a missing photo, so a card without one is still a person. */
function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function StaffPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const people = await listPublicCultureStaff();

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("staffPage.title")} subtitle={text("staffPage.subtitle")} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {people.map((person, index) => {
            const name = localizedStaff(person, locale, "name");
            const role = localizedStaff(person, locale, "role");
            const description = localizedStaff(person, locale, "description");
            const photo = person.images[0];

            return (
              <FadeIn key={person.id} delay={index * 100}>
                <div className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-shadow overflow-hidden h-full">
                  <div className="aspect-square relative bg-ocean/5 flex items-center justify-center">
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={name ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                      />
                    ) : (
                      <span className="text-6xl font-bold text-ocean/30">{initials(name)}</span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="font-bold text-ocean text-base sm:text-lg leading-tight mb-1">{name}</h3>
                    {role && <p className="text-gold-dark font-semibold text-xs sm:text-sm">{role}</p>}
                    {description && (
                      <p className="text-ocean/60 text-xs sm:text-sm leading-relaxed mt-2">{description}</p>
                    )}

                    {(person.phone || person.email) && (
                      <div className="mt-3 pt-3 border-t border-cream-dark space-y-1 text-xs sm:text-sm">
                        {person.phone && (
                          <p>
                            <a href={telHref(person.phone)} className="text-ocean/70 hover:text-gold-dark">
                              {person.phone}
                            </a>
                          </p>
                        )}
                        {person.email && (
                          <p>
                            <a href={`mailto:${person.email}`} className="text-ocean/70 hover:text-gold-dark">
                              {person.email}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
