"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { matchesDateBucket, type DateBucket, type EventCategory, type EventItem } from "@/data/events";

type AfishaFiltersProps = {
  events: EventItem[];
  moreLabel: string;
  dateFilterLabels: { all: string; today: string; week: string; month: string };
  categoryOptions: { value: EventCategory; label: string }[];
  emptyStateLabel: string;
};

const DATE_BUCKETS: DateBucket[] = ["all", "today", "week", "month"];

const CHIP_BASE =
  "px-4 py-2 text-sm font-semibold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2";

export default function AfishaFilters({
  events,
  moreLabel,
  dateFilterLabels,
  categoryOptions,
  emptyStateLabel,
}: AfishaFiltersProps) {
  const [dateBucket, setDateBucket] = useState<DateBucket>("all");
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set());
  const [now] = useState(() => new Date());

  function toggleCategory(cat: EventCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const filtered = events.filter((event) => {
    const dateOk = matchesDateBucket(event.isoDate, dateBucket, now);
    const catOk = selectedCategories.size === 0 || event.categories.some((c) => selectedCategories.has(c));
    return dateOk && catOk;
  });

  return (
    <div>
      <div role="radiogroup" aria-label={dateFilterLabels.all} className="flex flex-wrap gap-2 mb-3">
        {DATE_BUCKETS.map((bucket) => {
          const active = dateBucket === bucket;
          return (
            <button
              key={bucket}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDateBucket(bucket)}
              className={`${CHIP_BASE} ${
                active
                  ? "bg-gold text-ocean-dark"
                  : "border border-ocean/25 text-ocean/80 hover:bg-ocean hover:text-white hover:border-ocean"
              }`}
            >
              {dateFilterLabels[bucket]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-8 sm:mb-10">
        {categoryOptions.map(({ value, label }) => {
          const active = selectedCategories.has(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => toggleCategory(value)}
              className={`${CHIP_BASE} ${
                active
                  ? "bg-ocean text-cream"
                  : "border border-ocean/25 text-ocean/80 hover:bg-ocean hover:text-white hover:border-ocean"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {filtered.length === 0 ? (
          <p className="text-center text-ocean/60 py-16">{emptyStateLabel}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filtered.map((event, index) => (
              <FadeIn key={event.slug} delay={index * 100}>
                <div className="group bg-cream/40 rounded-3xl overflow-hidden border border-cream-dark shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 left-3 bg-ocean text-cream text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                      {event.date}
                    </div>
                    <div className="absolute top-3 right-3 bg-gold text-ocean text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow">
                      {event.time}
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-ocean text-lg mb-2">{event.title}</h3>
                    <p className="text-ocean/70 text-sm mb-4 flex-1">{event.description}</p>
                    <Link
                      href={`/afisha/${event.slug}`}
                      className="btn-primary inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold"
                    >
                      {moreLabel}
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
