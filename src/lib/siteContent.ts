/**
 * The editable text of the site.
 *
 * Which texts exist is decided by the page layout, which lives in code, so the keys
 * and their defaults are declared here. The database stores only what an institution
 * changed. Three things follow: no migration has to seed forty rows, the site reads
 * exactly as before until somebody edits something, and a new institution starts
 * from sensible wording instead of blank space.
 *
 * The defaults carry this house of culture's own words. For a second institution
 * they will be wrong until its administrator rewrites them — still better than
 * empty fields.
 *
 * No server imports: the admin form renders straight from these groups.
 */
export type ContentField = {
  key: string;
  label: string;
  /** Rendered as a textarea in the admin form. */
  long?: boolean;
  kk: string;
  ru: string;
};

export type ContentGroup = {
  id: string;
  title: string;
  hint?: string;
  fields: ContentField[];
};

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    id: "hero",
    title: "Первый экран",
    hint: "Самый верх главной страницы, над кнопками «Афиша» и «О нас».",
    fields: [
      {
        key: "hero.eyebrow",
        label: "Надпись над названием",
        kk: "Атырау облысы, Жылыой ауданы",
        ru: "Атырауская область, Жылыойский район",
      },
      { key: "hero.titleGold", label: "Название, первая строка", kk: "«Кең Жылыой»", ru: "«Кен Жылыой»" },
      { key: "hero.titleCream", label: "Название, вторая строка", kk: "мәдениет үйі", ru: "дом культуры" },
      {
        key: "hero.subtitle",
        label: "Описание под названием",
        long: true,
        kk: "Жылыой ауданының мәдени өмірінің ордасы — концерттер, шығармашылық үйірмелер мен ансамбльдер, ұлттық өнерді сақтау және дамыту",
        ru: "Центр культурной жизни Жылыойского района — концерты, творческие коллективы и ансамбли, сохранение и развитие национального искусства",
      },
    ],
  },
  {
    id: "events",
    title: "Блок «Афиша»",
    hint: "Сами мероприятия берутся из раздела «Мероприятия»; здесь только заголовок блока.",
    fields: [
      { key: "events.title", label: "Заголовок", kk: "Афиша", ru: "Афиша" },
      {
        key: "events.subtitle",
        label: "Подзаголовок",
        kk: "Жақын арадағы іс-шаралар",
        ru: "Ближайшие мероприятия",
      },
    ],
  },
  {
    id: "clubs",
    title: "Блок «Кружки»",
    hint: "Сами кружки берутся из раздела «Кружки»; карточка ансамбля задаётся здесь.",
    fields: [
      {
        key: "clubs.title",
        label: "Заголовок",
        kk: "Шығармашылық үйірмелер мен секциялар",
        ru: "Творческие кружки и секции",
      },
      {
        key: "clubs.subtitle",
        label: "Подзаголовок",
        kk: "Мәдениет үйінде әр жасқа лайық бағыттар жұмыс істейді",
        ru: "В доме культуры работают направления для любого возраста",
      },
      {
        key: "clubs.ensembleTitle",
        label: "Карточка ансамбля: название",
        kk: "«Жылыой сазы» фольклорлық ансамблі",
        ru: "Фольклорный ансамбль «Жылыой сазы»",
      },
      {
        key: "clubs.ensembleDescription",
        label: "Карточка ансамбля: описание",
        long: true,
        kk: "Домбыра, қобыз, шертер және басқа да ұлттық аспаптарда ойнауды үйретеді. 18 кәсіби өнерпаз құрамында.",
        ru: "Обучение игре на домбре, кобызе, шертере и других национальных инструментах. В составе 18 профессиональных артистов.",
      },
    ],
  },
  {
    id: "news",
    title: "Блок «Новости»",
    hint: "Сами новости берутся из раздела «Новости»; здесь только заголовок блока.",
    fields: [
      { key: "news.title", label: "Заголовок", kk: "Жаңалықтар", ru: "Новости" },
      {
        key: "news.subtitle",
        label: "Подзаголовок",
        kk: "Мәдениет үйінің соңғы оқиғалары",
        ru: "Последние события Дома культуры",
      },
    ],
  },
  {
    id: "gallery",
    title: "Блок «Видео и фотогалерея»",
    fields: [
      { key: "gallery.title", label: "Заголовок", kk: "Бейне және фотогалерея", ru: "Видео и фотогалерея" },
      {
        key: "gallery.subtitle",
        label: "Подзаголовок",
        kk: "Ансамбльдің концерттері мен өнерпаздарынан үзінділер",
        ru: "Кадры с концертов и артистов ансамбля",
      },
    ],
  },
  {
    id: "about",
    title: "Блок «О нас»",
    hint: "Цифры пишите как они должны выглядеть: 18, 10+, 2026.",
    fields: [
      { key: "about.eyebrow", label: "Надпись над заголовком", kk: "Біз туралы", ru: "О нас" },
      {
        key: "about.title",
        label: "Заголовок",
        kk: "«Кең Жылыой» мәдениет үйі",
        ru: "Дом культуры «Кен Жылыой»",
      },
      {
        key: "about.description",
        label: "Описание",
        long: true,
        kk: "Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімінің қарамағындағы мекеме. Ғимарат қабырғасында аудан тұрғындарына арналған шығармашылық үйірмелер мен ансамбльдер жұмыс істейді, концерттер мен мерекелік іс-шаралар өткізіледі.",
        ru: "Учреждение находится в ведении отдела культуры, развития языков, физической культуры и спорта Жылыойского района. В доме культуры работают творческие кружки и коллективы для жителей района, проводятся концерты и праздничные мероприятия.",
      },
      { key: "about.stat1Value", label: "Цифра 1", kk: "18", ru: "18" },
      { key: "about.stat1Label", label: "Подпись к цифре 1", kk: "кәсіби өнерпаз", ru: "профессиональных артистов" },
      { key: "about.stat2Value", label: "Цифра 2", kk: "10+", ru: "10+" },
      {
        key: "about.stat2Label",
        label: "Подпись к цифре 2",
        kk: "репертуардағы туынды",
        ru: "произведений в репертуаре",
      },
      { key: "about.stat3Value", label: "Цифра 3", kk: "2026", ru: "2026" },
      {
        key: "about.stat3Label",
        label: "Подпись к цифре 3",
        kk: "ансамбль құрылған жыл",
        ru: "год основания ансамбля",
      },
    ],
  },
  {
    id: "founders",
    title: "Блок «Учредитель»",
    fields: [
      {
        key: "founders.eyebrow",
        label: "Надпись над блоком",
        kk: "Құрылтайшы және басшылық орган",
        ru: "Учредитель и вышестоящая организация",
      },
      {
        key: "founders.org1Name",
        label: "Организация 1: название",
        kk: "Жылыой ауданының әкімдігі",
        ru: "Акимат Жылыойского района",
      },
      { key: "founders.org1Role", label: "Организация 1: роль", kk: "Құрылтайшы", ru: "Учредитель" },
      {
        key: "founders.org2Name",
        label: "Организация 2: название",
        long: true,
        kk: "Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімі",
        ru: "Отдел культуры, развития языков, физической культуры и спорта Жылыойского района",
      },
      { key: "founders.org2Role", label: "Организация 2: роль", kk: "Жоғары тұрған ұйым", ru: "Вышестоящая организация" },
    ],
  },
  {
    id: "contacts",
    title: "Страница «Контакты»",
    hint: "Адрес, телефон и почта задаются в разделе «Настройки».",
    fields: [
      {
        key: "contacts.hours",
        label: "Часы работы",
        kk: "Дүйсенбі – Жұма: 09:00 – 18:30",
        ru: "Понедельник – Пятница: 09:00 – 18:30",
      },
      {
        key: "contacts.lunch",
        label: "Обеденный перерыв",
        kk: "Түскі үзіліс: 13:00 – 14:30",
        ru: "Обеденный перерыв: 13:00 – 14:30",
      },
      {
        key: "contacts.weekend",
        label: "Выходные",
        kk: "Сенбі, Жексенбі — демалыс",
        ru: "Суббота, воскресенье — выходной",
      },
      { key: "contacts.rehearsal1Day", label: "Репетиции: дни 1", kk: "Сейсенбі, Бейсенбі", ru: "Вторник, четверг" },
      { key: "contacts.rehearsal1Time", label: "Репетиции: время 1", kk: "18:00 – 20:00", ru: "18:00 – 20:00" },
      { key: "contacts.rehearsal2Day", label: "Репетиции: дни 2", kk: "Сенбі", ru: "Суббота" },
      { key: "contacts.rehearsal2Time", label: "Репетиции: время 2", kk: "10:00 – 13:00", ru: "10:00 – 13:00" },
      {
        key: "contacts.rehearsalNote",
        label: "Примечание к репетициям",
        kk: "* Концерт алдында қосымша репетициялар болуы мүмкін",
        ru: "* Перед концертами возможны дополнительные репетиции",
      },
      {
        key: "contacts.legalFullName",
        label: "Полное официальное наименование",
        long: true,
        kk: "«Кең Жылыой» Жылыой аудандық мәдениет үйі» коммуналдық мемлекеттік қазыналық кәсіпорыны",
        ru: "КГКП «Дом культуры «Кен Жылыой» Жылыойского района» (перевод предварительный, требует сверки с регистрационными документами)",
      },
      {
        key: "contacts.director",
        label: "Руководитель",
        kk: "Темирханов Алибек Жумаханович",
        ru: "Темирханов Алибек Жумаханович",
      },
      {
        key: "contacts.founder",
        label: "Учредитель (в реквизитах)",
        long: true,
        kk: "Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімі",
        ru: "Отдел культуры, развития языков, физической культуры и спорта Жылыойского района",
      },
    ],
  },
];

/** Every key with its built-in wording, flattened for lookup. */
export const CONTENT_DEFAULTS: Record<string, { kk: string; ru: string }> = Object.fromEntries(
  CONTENT_GROUPS.flatMap((group) => group.fields.map((f) => [f.key, { kk: f.kk, ru: f.ru }]))
);

export type ContentKey = string;
