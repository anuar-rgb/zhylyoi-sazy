import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import AfishaFilters from "@/components/AfishaFilters";
import { events, type EventCategory } from "@/data/events";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Афиша",
    description: "«Кең Жылыой» мәдениет үйінің жақын арадағы концерттері, спектакльдері мен көрмелері.",
  },
  ru: {
    title: "Афиша",
    description: "Ближайшие концерты, спектакли и выставки Дома культуры «Кен Жылыой».",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    more: string;
    dateFilters: { all: string; today: string; week: string; month: string };
    categoryFilters: Record<EventCategory, string>;
    emptyState: string;
  }
> = {
  kk: {
    title: "Афиша",
    subtitle: "Мәдениет үйінің жақын арадағы іс-шаралары",
    more: "Толығырақ",
    dateFilters: { all: "Барлығы", today: "Бүгін", week: "Осы апта", month: "Осы ай" },
    categoryFilters: {
      concert: "Концерттер",
      performance: "Спектакльдер",
      exhibition: "Көрмелер",
      competition: "Байқаулар",
      children: "Балаларға арналған",
    },
    emptyState: "Бұл сүзгілерге сәйкес іс-шаралар табылмады.",
  },
  ru: {
    title: "Афиша",
    subtitle: "Ближайшие мероприятия Дома культуры",
    more: "Подробнее",
    dateFilters: { all: "Все", today: "Сегодня", week: "Эта неделя", month: "Этот месяц" },
    categoryFilters: {
      concert: "Концерты",
      performance: "Спектакли",
      exhibition: "Выставки",
      competition: "Конкурсы",
      children: "Детские мероприятия",
    },
    emptyState: "По выбранным фильтрам мероприятий не найдено.",
  },
};

export default async function AfishaPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  const allEvents = events[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <AfishaFilters
          events={allEvents}
          moreLabel={t.more}
          dateFilterLabels={t.dateFilters}
          categoryOptions={(Object.keys(t.categoryFilters) as EventCategory[]).map((value) => ({
            value,
            label: t.categoryFilters[value],
          }))}
          emptyStateLabel={t.emptyState}
        />
      </div>
    </section>
  );
}
