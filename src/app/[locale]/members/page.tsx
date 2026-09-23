import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import MemberCard from "@/components/MemberCard";
import { getSiteText } from "@/lib/orgContent";
import { listPublicCultureMembers } from "@/lib/cultureMembers";
import { listPublicCultureClubs, localized } from "@/lib/cultureClubs";
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
  const [members, collectives] = await Promise.all([
    listPublicCultureMembers(),
    listPublicCultureClubs("creative_collective"),
  ]);

  // One group per collective, in the order the collectives themselves come, plus a
  // final group for anybody not yet assigned. Grouping in the page rather than
  // asking per collective keeps it to the two queries above.
  const groups = collectives
    .map((collective) => ({
      key: collective.id,
      heading: localized(collective, locale, "name") ?? "",
      people: members.filter((member) => member.clubId === collective.id),
    }))
    .filter((group) => group.people.length > 0);

  const unassigned = members.filter((member) => member.clubId === null);
  if (unassigned.length > 0) groups.push({ key: "none", heading: "", people: unassigned });
  const educationLabel = text("membersPage.educationLabel");

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={text("membersPage.title")} subtitle={text("membersPage.subtitle")} />
        </FadeIn>

        {groups.map((group) => (
          <div key={group.key} className="mb-10 sm:mb-14 last:mb-0">
            {group.heading && (
              <FadeIn>
                <h2 className="text-xl sm:text-2xl font-bold text-ocean mb-4 sm:mb-6">
                  {group.heading}{" "}
                  <span className="text-ocean/40 font-normal text-base">({group.people.length})</span>
                </h2>
              </FadeIn>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {group.people.map((member, index) => (
                <FadeIn key={member.id} delay={(index % 3) * 100}>
                  <MemberCard member={member} locale={locale} educationLabel={educationLabel} index={index} />
                </FadeIn>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
