import type { Metadata } from "next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import { getSiteText } from "@/lib/orgContent";
import { listPublicCultureMembers, localizedMember } from "@/lib/cultureMembers";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Құрам",
    description:
      "«Жылыой сазы» ансамблінің 18 кәсіби өнерпазы — домбырашылар, қобызшылар, баяншылар, солисттер. Қазақстанның жетекші музыкалық оқу орындарының түлектері.",
  },
  ru: {
    title: "Состав",
    description:
      "18 профессиональных артистов ансамбля «Жылыой сазы» — домбристы, кобызисты, баянисты, солисты. Выпускники ведущих музыкальных учебных заведений Казахстана.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

export default async function MembersPage() {
  const locale = (await getLocale()) as Locale;
  const text = await getSiteText(locale);
  const members = await listPublicCultureMembers();
  const educationLabel = text("membersPage.educationLabel");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("membersPage.title")} subtitle={text("membersPage.subtitle")} />
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {members.map((member, index) => {
            const name = localizedMember(member, locale, "name");
            const role = localizedMember(member, locale, "role");
            const education = localizedMember(member, locale, "education");
            const specialty = localizedMember(member, locale, "specialty");
            const level = localizedMember(member, locale, "level");
            const photo = member.images[0];

            return (
              <FadeIn key={member.id} delay={(index % 3) * 100}>
                <div className="bg-white rounded-3xl shadow-sm border border-cream-dark hover:shadow-md transition-shadow overflow-hidden h-full">
                  <div className="aspect-[3/4] relative bg-ocean/5">
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={name ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-ocean/10">
                        <span className="text-5xl font-bold text-ocean/30">{name?.charAt(0) ?? "?"}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-ocean/80 text-cream text-xs px-2.5 py-1 rounded-full font-medium">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="font-bold text-ocean text-base sm:text-lg leading-tight mb-1">{name}</h3>
                    {role && <p className="text-gold-dark font-semibold text-xs sm:text-sm mb-2 sm:mb-3">{role}</p>}
                    <div className="space-y-1.5 text-xs sm:text-sm text-ocean/60">
                      {education && (
                        <p className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-gold shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"
                            />
                          </svg>
                          <span>{education}</span>
                        </p>
                      )}
                      {specialty && (
                        <p className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-gold shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                            />
                          </svg>
                          <span>«{specialty}»</span>
                        </p>
                      )}
                      {level && (
                        <p>
                          {/* Coloured from the stored flag, not from the level text:
                              that text is editable, and comparing against a word would
                              let a typo change the design. */}
                          <span
                            className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${
                              member.hasHigherEducation
                                ? "bg-gold/20 text-gold-dark"
                                : "bg-ocean/10 text-ocean/70"
                            }`}
                          >
                            {educationLabel}: {level}
                          </span>
                        </p>
                      )}
                    </div>
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
