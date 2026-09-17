import type { Locale } from "@/i18n/routing";

export type EventCategory = "concert" | "performance" | "exhibition" | "competition" | "children";

export type EventItem = {
  slug: string;
  date: string;
  /** ISO date (YYYY-MM-DD), used to build calendar files. */
  isoDate: string;
  time: string;
  /** Event duration in hours, used to compute the calendar end time. */
  durationHours: number;
  title: string;
  description: string;
  location: string;
  organizer: string;
  categories: EventCategory[];
  image: string;
  /** Placeholder long-form text until real per-event content is provided. */
  fullText: string[];
};

const VENUE_KK = "«Кең Жылыой» мәдениет үйі, Махамбет даңғылы, 37, Құлсары қаласы";
const VENUE_RU = "Дом культуры «Кен Жылыой», проспект Махамбет, 37, г. Кульсары";

export const events: Record<Locale, EventItem[]> = {
  kk: [
    {
      slug: "merekelik-kontsert",
      date: "20 қыркүйек",
      isoDate: "2026-09-20",
      time: "19:00",
      durationHours: 2,
      title: "Мерекелік концерт",
      description: "Қазақ халық әндері мен күйлерінің кеші, ұлттық аспаптар сүйемелдеуімен",
      location: VENUE_KK,
      organizer: "«Жылыой сазы» ансамблі",
      categories: ["concert"],
      image: "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg",
      fullText: [
        "Кеш барысында «Жылыой сазы» ансамблі мен мәдениет үйінің басқа да ұжымдары қазақ халық әндері мен күйлерінен құралған бағдарлама ұсынады.",
        "Кіру тегін. Орын саны шектеулі болғандықтан, алдын ала келуді ұсынамыз.",
      ],
    },
    {
      slug: "balalar-teatr",
      date: "4 қазан",
      isoDate: "2026-10-04",
      time: "18:00",
      durationHours: 1,
      title: "Балалар театр спектаклі",
      description: "Ауданның жас көрермендеріне арналған қойылым",
      location: VENUE_KK,
      organizer: "Театр үйірмесі",
      categories: ["performance", "children"],
      image: "https://images.pexels.com/photos/6896181/pexels-photo-6896181.jpeg",
      fullText: [
        "Театр үйірмесінің қатысуымен өтетін қойылым ертегі желісіне негізделген және барлық жастағы балаларға арналған.",
        "Ата-аналарды балаларымен бірге келуге шақырамыз.",
      ],
    },
    {
      slug: "onerkoli-korme",
      date: "15 қазан",
      isoDate: "2026-10-15",
      time: "11:00",
      durationHours: 6,
      title: "Қолөнер және сурет көрмесі",
      description: "Өңір шеберлері мен балалар шығармашылық үйірмелерінің жұмыстары",
      location: VENUE_KK,
      organizer: "ИЗО үйірмесі",
      categories: ["exhibition"],
      image: "https://images.pexels.com/photos/2559741/pexels-photo-2559741.jpeg",
      fullText: [
        "Көрмеде өңір шеберлерінің қолөнер туындылары және ИЗО үйірмесінің тәрбиеленушілерінің жұмыстары қойылады.",
        "Көрме күні бойы ашық, кіру тегін.",
      ],
    },
    {
      slug: "esep-kontsert",
      date: "1 қараша",
      isoDate: "2026-11-01",
      time: "17:00",
      durationHours: 2,
      title: "«Жылыой сазы» есеп концерті",
      description: "Ансамбльдің жарты жылдық шығармашылық есебі, жаңа репертуар үлгілерімен",
      location: VENUE_KK,
      organizer: "«Жылыой сазы» ансамблі",
      categories: ["concert"],
      image: "/images/gallery/ensemble-photo.jpeg",
      fullText: [
        "Концертте ансамбль соңғы жарты жылда дайындаған жаңа шығармалар тұңғыш рет сахнаға шығарылады.",
        "Билеттер мәдениет үйінің әкімшілігінде қолжетімді.",
      ],
    },
    {
      slug: "bi-vokal-otchet",
      date: "20 қараша",
      isoDate: "2026-11-20",
      time: "18:30",
      durationHours: 2,
      title: "Би және вокал үйірмелерінің отчеттік кеші",
      description: "Жас өнерпаздардың жылдық жұмысының қорытынды көрсетілімі",
      location: VENUE_KK,
      organizer: "Би және вокал үйірмелері",
      categories: ["performance", "children"],
      image: "https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg",
      fullText: [
        "Кешке би және вокал үйірмелерінің барлық тобы қатысады, жыл ішінде меңгерген нөмірлерін ұсынады.",
        "Тәрбиеленушілердің отбасыларын қатысуға шақырамыз.",
      ],
    },
  ],
  ru: [
    {
      slug: "merekelik-kontsert",
      date: "20 сентября",
      isoDate: "2026-09-20",
      time: "19:00",
      durationHours: 2,
      title: "Праздничный концерт",
      description: "Вечер казахских народных песен и кюев в сопровождении национальных инструментов",
      location: VENUE_RU,
      organizer: "Ансамбль «Жылыой сазы»",
      categories: ["concert"],
      image: "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg",
      fullText: [
        "В программе вечера — ансамбль «Жылыой сазы» и другие коллективы дома культуры представят подборку казахских народных песен и кюев.",
        "Вход свободный. Количество мест ограничено, рекомендуем прийти заранее.",
      ],
    },
    {
      slug: "balalar-teatr",
      date: "4 октября",
      isoDate: "2026-10-04",
      time: "18:00",
      durationHours: 1,
      title: "Детский театральный спектакль",
      description: "Постановка для юных зрителей района",
      location: VENUE_RU,
      organizer: "Театральный кружок",
      categories: ["performance", "children"],
      image: "https://images.pexels.com/photos/6896181/pexels-photo-6896181.jpeg",
      fullText: [
        "Спектакль театрального кружка по мотивам сказочного сюжета рассчитан на зрителей всех возрастов.",
        "Приглашаем родителей приходить вместе с детьми.",
      ],
    },
    {
      slug: "onerkoli-korme",
      date: "15 октября",
      isoDate: "2026-10-15",
      time: "11:00",
      durationHours: 6,
      title: "Выставка декоративно-прикладного искусства",
      description: "Работы мастеров региона и детских творческих кружков",
      location: VENUE_RU,
      organizer: "Кружок ИЗО",
      categories: ["exhibition"],
      image: "https://images.pexels.com/photos/2559741/pexels-photo-2559741.jpeg",
      fullText: [
        "На выставке представлены работы мастеров региона и воспитанников кружка ИЗО и творчества.",
        "Выставка открыта весь день, вход свободный.",
      ],
    },
    {
      slug: "esep-kontsert",
      date: "1 ноября",
      isoDate: "2026-11-01",
      time: "17:00",
      durationHours: 2,
      title: "Отчётный концерт «Жылыой сазы»",
      description: "Творческий отчёт ансамбля за полугодие с новыми произведениями репертуара",
      location: VENUE_RU,
      organizer: "Ансамбль «Жылыой сазы»",
      categories: ["concert"],
      image: "/images/gallery/ensemble-photo.jpeg",
      fullText: [
        "На концерте впервые прозвучат новые произведения, подготовленные ансамблем за последнее полугодие.",
        "Билеты можно получить в администрации дома культуры.",
      ],
    },
    {
      slug: "bi-vokal-otchet",
      date: "20 ноября",
      isoDate: "2026-11-20",
      time: "18:30",
      durationHours: 2,
      title: "Отчётный вечер танцевального и вокального кружков",
      description: "Итоговый показ годовой работы юных артистов",
      location: VENUE_RU,
      organizer: "Танцевальный и вокальный кружки",
      categories: ["performance", "children"],
      image: "https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg",
      fullText: [
        "В вечере примут участие все группы танцевального и вокального кружков с номерами, подготовленными за год.",
        "Приглашаем семьи воспитанников на этот вечер.",
      ],
    },
  ],
};

export function getEvent(locale: Locale, slug: string): EventItem | undefined {
  return events[locale].find((e) => e.slug === slug);
}

export type DateBucket = "all" | "today" | "week" | "month";

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Whether an event's isoDate falls into the given date bucket, relative to `now`. */
export function matchesDateBucket(isoDate: string, bucket: DateBucket, now: Date): boolean {
  if (bucket === "all") return true;
  const eventDate = parseIsoDate(isoDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (bucket === "today") {
    return eventDate.getTime() === today.getTime();
  }
  if (bucket === "week") {
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    return eventDate.getTime() >= today.getTime() && eventDate.getTime() <= in7Days.getTime();
  }
  return eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIcsDate(isoDate: string, time: string, addHours = 0): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date(year, month - 1, day, hour + addHours, minute);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** Builds a downloadable data: URI containing a minimal .ics calendar file for the event. */
export function buildIcsDataUri(event: EventItem): string {
  const start = toIcsDate(event.isoDate, event.time);
  const end = toIcsDate(event.isoDate, event.time, event.durationHours);
  const escape = (s: string) => s.replace(/[,;]/g, (m) => `\\${m}`);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Keng Zhylyoi//Afisha//KK",
    "BEGIN:VEVENT",
    `UID:${event.slug}@culture-portal-kz`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const ics = lines.join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
