import type { Locale } from "@/i18n/routing";

export type ClubItem = {
  slug: string;
  title: string;
  direction: string;
  /** Placeholder until the institution provides real per-club data. */
  ageRange: string;
  instructor: string;
  schedule: string;
  capacity: string;
  description: string;
  fullText: string[];
  images: string[];
};

export const clubs: Record<Locale, ClubItem[]> = {
  kk: [
    {
      slug: "bi",
      title: "Би үйірмесі",
      direction: "Хореография",
      ageRange: "Нақтыланады",
      instructor: "Нақтыланады",
      schedule: "Нақтыланады",
      capacity: "Нақтыланады",
      description: "Ұлттық және заманауи би өнерін меңгеруге ниет білдіретін балалар мен жасөспірімдерге арналған.",
      fullText: [
        "Үйірмеде балалар мен жасөспірімдер қазақ ұлттық билерінің негіздерін, сондай-ақ заманауи хореография элементтерін меңгереді.",
        "Жаттығулар жас топтарына бөлініп өткізіледі, жаңадан келгендерге арналған топтар да бар.",
      ],
      images: ["https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg"],
    },
    {
      slug: "vokal",
      title: "Вокал үйірмесі",
      direction: "Вокал",
      ageRange: "Нақтыланады",
      instructor: "Нақтыланады",
      schedule: "Нақтыланады",
      capacity: "Нақтыланады",
      description: "Ән айту өнерін, дауыс қою негіздерін және сахналық мәдениетті үйренуге мүмкіндік береді.",
      fullText: [
        "Үйірмеде ән салу техникасы, дауыс қою негіздері және сахналық мәдениет үйретіледі.",
        "Тәрбиеленушілер мәдениет үйінің концерттері мен байқауларына қатысады.",
      ],
      images: ["https://images.pexels.com/photos/8815039/pexels-photo-8815039.jpeg"],
    },
    {
      slug: "teatr",
      title: "Театр үйірмесі",
      direction: "Театр өнері",
      ageRange: "Нақтыланады",
      instructor: "Нақтыланады",
      schedule: "Нақтыланады",
      capacity: "Нақтыланады",
      description: "Актерлік шеберлік, сахналық сөйлеу және қойылымдарға қатысу арқылы өнерге баулиды.",
      fullText: [
        "Үйірмеде актерлік шеберлік негіздері, сахналық сөйлеу және қойылымдарға қатысу дағдылары үйретіледі.",
        "Тәрбиеленушілер мәдениет үйінің спектакльдері мен іс-шараларына қатысады.",
      ],
      images: ["https://images.pexels.com/photos/12165875/pexels-photo-12165875.jpeg"],
    },
    {
      slug: "izo",
      title: "ИЗО және қолөнер үйірмесі",
      direction: "Бейнелеу өнері",
      ageRange: "Нақтыланады",
      instructor: "Нақтыланады",
      schedule: "Нақтыланады",
      capacity: "Нақтыланады",
      description: "Сурет салу, кескіндеме және қолөнер негіздерін үйрете отырып, балалардың шығармашылық қиялын дамытады.",
      fullText: [
        "Үйірмеде сурет салу, кескіндеме және қолөнер негіздері үйретіледі.",
        "Тәрбиеленушілердің жұмыстары мәдениет үйінің көрмелерінде ұсынылады.",
      ],
      images: ["https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg"],
    },
  ],
  ru: [
    {
      slug: "bi",
      title: "Танцевальный кружок",
      direction: "Хореография",
      ageRange: "Уточняется",
      instructor: "Уточняется",
      schedule: "Уточняется",
      capacity: "Уточняется",
      description: "Для детей и подростков, желающих освоить национальное и современное хореографическое искусство.",
      fullText: [
        "В кружке дети и подростки осваивают основы казахских национальных танцев, а также элементы современной хореографии.",
        "Занятия проводятся по возрастным группам, есть группы для начинающих.",
      ],
      images: ["https://images.pexels.com/photos/9480473/pexels-photo-9480473.jpeg"],
    },
    {
      slug: "vokal",
      title: "Вокальный кружок",
      direction: "Вокал",
      ageRange: "Уточняется",
      instructor: "Уточняется",
      schedule: "Уточняется",
      capacity: "Уточняется",
      description: "Обучение вокальному искусству, основам постановки голоса и сценической культуре.",
      fullText: [
        "В кружке обучают технике пения, основам постановки голоса и сценической культуре.",
        "Воспитанники участвуют в концертах и конкурсах дома культуры.",
      ],
      images: ["https://images.pexels.com/photos/8815039/pexels-photo-8815039.jpeg"],
    },
    {
      slug: "teatr",
      title: "Театральный кружок",
      direction: "Театральное искусство",
      ageRange: "Уточняется",
      instructor: "Уточняется",
      schedule: "Уточняется",
      capacity: "Уточняется",
      description: "Актёрское мастерство, сценическая речь и участие в постановках дома культуры.",
      fullText: [
        "В кружке преподают основы актёрского мастерства, сценическую речь и навыки участия в постановках.",
        "Воспитанники принимают участие в спектаклях и мероприятиях дома культуры.",
      ],
      images: ["https://images.pexels.com/photos/12165875/pexels-photo-12165875.jpeg"],
    },
    {
      slug: "izo",
      title: "Кружок ИЗО и творчества",
      direction: "Изобразительное искусство",
      ageRange: "Уточняется",
      instructor: "Уточняется",
      schedule: "Уточняется",
      capacity: "Уточняется",
      description: "Рисование, живопись и основы декоративно-прикладного искусства для развития творческого мышления детей.",
      fullText: [
        "В кружке обучают основам рисования, живописи и декоративно-прикладного искусства.",
        "Работы воспитанников представляются на выставках дома культуры.",
      ],
      images: ["https://images.pexels.com/photos/8382387/pexels-photo-8382387.jpeg"],
    },
  ],
};

export function getClub(locale: Locale, slug: string): ClubItem | undefined {
  return clubs[locale].find((c) => c.slug === slug);
}
