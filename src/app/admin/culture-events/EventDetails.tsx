import Image from "next/image";
import type { CultureEventRecord } from "@/lib/cultureEvents";
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from "@/lib/eventFields";
import { formatDateNumeric, formatTime } from "@/lib/timeZone";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

function moment(iso: string | null): string | null {
  return iso ? `${formatDateNumeric(iso)} ${formatTime(iso)}` : null;
}

/** Kazakh first, as on the form; the Russian under it only when it says something different. */
function Pair({ kk, ru }: { kk: string | null; ru: string | null }) {
  const first = kk ?? ru;
  if (!first) return <>—</>;
  return (
    <>
      {first}
      {kk && ru && ru !== kk && <span className="block text-ocean/50">{ru}</span>}
    </>
  );
}

/**
 * What an event is, as a plain «параметр — значение» list with its photos: no inputs. Used where
 * the event is only looked at — a past or archived one (isEventLocked).
 */
export default function EventDetails({ event, hallName }: { event: CultureEventRecord; hallName: string | null }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Название", value: <Pair kk={event.titleKk} ru={event.titleRu} /> },
    { label: "Начало", value: moment(event.eventDate) ?? "—" },
    { label: "Окончание", value: moment(event.endDate) ?? "—" },
    { label: "Место", value: <Pair kk={event.locationKk} ru={event.locationRu} /> },
    { label: "Организатор", value: <Pair kk={event.organizerKk} ru={event.organizerRu} /> },
    { label: "Возрастное ограничение", value: event.ageLimit ?? "—" },
    ...(hallName ? [{ label: "Зал", value: hallName }] : []),
    {
      label: "Категории",
      value: event.categories.length > 0 ? event.categories.map((c) => EVENT_CATEGORY_LABELS[c]).join(", ") : "—",
    },
    { label: "Статус", value: EVENT_STATUS_LABELS[event.status] ?? event.status },
    ...(event.descriptionKk || event.descriptionRu
      ? [{ label: "Краткое описание", value: <Pair kk={event.descriptionKk} ru={event.descriptionRu} /> }]
      : []),
  ];

  return (
    <div className={`${CARD} overflow-hidden`}>
      <dl className="divide-y divide-cream-dark">
        {rows.map((row) => (
          <div key={row.label} className="grid sm:grid-cols-[220px_1fr] gap-x-6 gap-y-0.5 px-5 sm:px-6 py-3">
            <dt className="text-sm text-ocean/50">{row.label}</dt>
            <dd className="text-sm text-ocean break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      {event.images.length > 0 && (
        <div className="border-t border-cream-dark px-5 sm:px-6 py-4">
          <p className="text-sm text-ocean/50 mb-3">Фотографии</p>
          <div className="flex flex-wrap gap-2">
            {event.images.map((image) => (
              <div key={image.url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-cream-dark">
                <Image src={image.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
