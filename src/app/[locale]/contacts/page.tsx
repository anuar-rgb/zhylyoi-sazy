import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, Metadata> = {
  kk: {
    title: "Байланыс",
    description:
      "«Кең Жылыой» Жылыой аудандық мәдениет үйімен байланысу — мекенжай, телефон, жұмыс уақыты. Атырау облысы, Жылыой ауданы, Құлсары қаласы, Махамбет даңғылы, 37.",
  },
  ru: {
    title: "Контакты",
    description:
      "Связаться с домом культуры «Кен Жылыой» Жылыойского района — адрес, телефон, часы работы. Атырауская область, Жылыойский район, г. Кульсары, проспект Махамбет, 37.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return meta[locale];
}

const content = {
  kk: {
    title: "Байланыс",
    subtitle: "Бізбен хабарласыңыз",
    addressTitle: "Мекенжай",
    address: ["Атырау облысы, Жылыой ауданы, Құлсары қаласы", "Махамбет даңғылы, 37"],
    phoneTitle: "Телефон",
    emailTitle: "Email",
    hoursTitle: "Жұмыс уақыты",
    hours: "Дүйсенбі – Жұма: 09:00 – 18:30",
    lunch: "Түскі үзіліс: 13:00 – 14:30",
    weekend: "Сенбі, Жексенбі — демалыс",
    formTitle: "Хабарлама жіберу",
    nameLabel: "Аты-жөніңіз",
    namePlaceholder: "Есіміңізді жазыңыз",
    contactLabel: "Телефон немесе email",
    messageLabel: "Хабарлама",
    messagePlaceholder: "Хабарламаңызды жазыңыз...",
    submit: "Жіберу",
    rehearsalTitle: "Репетициялар кестесі",
    rehearsal: [
      { day: "Сейсенбі, Бейсенбі", time: "18:00 – 20:00" },
      { day: "Сенбі", time: "10:00 – 13:00" },
    ],
    rehearsalNote: "* Концерт алдында қосымша репетициялар болуы мүмкін",
    legalTitle: "Мекеменің ресми деректері",
    legalFullNameLabel: "Толық атауы",
    legalFullName: "«Кең Жылыой» Жылыой аудандық мәдениет үйі» коммуналдық мемлекеттік қазыналық кәсіпорыны",
    bsnLabel: "БСН",
    directorLabel: "Басшысы",
    director: "Темирханов Алибек Жумаханович",
    founderLabel: "Құрылтайшы",
    founder: "Жылыой ауданы мәдениет, тілдерді дамыту, дене шынықтыру және спорт бөлімі",
  },
  ru: {
    title: "Контакты",
    subtitle: "Свяжитесь с нами",
    addressTitle: "Адрес",
    address: ["Атырауская область, Жылыойский район, г. Кульсары", "проспект Махамбет, 37"],
    phoneTitle: "Телефон",
    emailTitle: "Email",
    hoursTitle: "Часы работы",
    hours: "Понедельник – Пятница: 09:00 – 18:30",
    lunch: "Обеденный перерыв: 13:00 – 14:30",
    weekend: "Суббота, воскресенье — выходной",
    formTitle: "Отправить сообщение",
    nameLabel: "Ваше имя",
    namePlaceholder: "Введите имя",
    contactLabel: "Телефон или email",
    messageLabel: "Сообщение",
    messagePlaceholder: "Введите сообщение...",
    submit: "Отправить",
    rehearsalTitle: "Расписание репетиций",
    rehearsal: [
      { day: "Вторник, четверг", time: "18:00 – 20:00" },
      { day: "Суббота", time: "10:00 – 13:00" },
    ],
    rehearsalNote: "* Перед концертами возможны дополнительные репетиции",
    legalTitle: "Официальные реквизиты учреждения",
    legalFullNameLabel: "Полное наименование",
    legalFullName:
      "КГКП «Дом культуры «Кен Жылыой» Жылыойского района» (перевод предварительный, требует сверки с регистрационными документами)",
    bsnLabel: "БИН",
    directorLabel: "Руководитель",
    director: "Темирханов Алибек Жумаханович",
    founderLabel: "Учредитель",
    founder: "Отдел культуры, развития языков, физической культуры и спорта Жылыойского района",
  },
} satisfies Record<Locale, unknown>;

export default async function ContactsPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <FadeIn>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.addressTitle}</h3>
                  {t.address.map((line) => (
                    <p key={line} className="text-ocean/70">{line}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.phoneTitle}</h3>
                  <a href="tel:+77789276387" className="text-ocean/70 hover:text-gold transition-colors">+7 778 927 63 87</a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.emailTitle}</h3>
                  <a href="mailto:dk.kenzhylyoi@gmail.com" className="text-ocean/70 hover:text-gold transition-colors">dk.kenzhylyoi@gmail.com</a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.hoursTitle}</h3>
                  <p className="text-ocean/70">{t.hours}</p>
                  <p className="text-ocean/70">{t.lunch}</p>
                  <p className="text-ocean/50 text-sm mt-1">{t.weekend}</p>
                </div>
              </div>
            </div>
          </div>
          </FadeIn>

          <FadeIn delay={150}>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-cream-dark">
              <h3 className="font-bold text-ocean text-lg mb-4">{t.formTitle}</h3>
              <form
                className="space-y-4"
                action="mailto:dk.kenzhylyoi@gmail.com"
                method="post"
                encType="text/plain"
              >
                <div>
                  <label className="block text-sm font-medium text-ocean/70 mb-1">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    name={t.nameLabel}
                    required
                    className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 shadow-sm"
                    placeholder={t.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ocean/70 mb-1">
                    {t.contactLabel}
                  </label>
                  <input
                    type="text"
                    name={t.contactLabel}
                    required
                    className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 shadow-sm"
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ocean/70 mb-1">
                    {t.messageLabel}
                  </label>
                  <textarea
                    rows={4}
                    name={t.messageLabel}
                    required
                    className="w-full px-5 py-3 border border-cream-dark rounded-3xl focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 resize-none shadow-sm"
                    placeholder={t.messagePlaceholder}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full py-3 font-semibold"
                >
                  {t.submit}
                </button>
              </form>
            </div>

            <div className="bg-gold/10 rounded-xl p-6 border border-gold/20">
              <h3 className="font-bold text-ocean mb-2">{t.rehearsalTitle}</h3>
              <ul className="space-y-2 text-ocean/70 text-sm">
                {t.rehearsal.map((r) => (
                  <li key={r.day} className="flex justify-between">
                    <span>{r.day}</span>
                    <span className="font-medium">{r.time}</span>
                  </li>
                ))}
              </ul>
              <p className="text-ocean/50 text-xs mt-3">
                {t.rehearsalNote}
              </p>
            </div>
          </div>
          </FadeIn>
        </div>

        <FadeIn delay={250}>
          <div className="mt-6 sm:mt-8 bg-white rounded-xl p-6 shadow-sm border border-cream-dark">
            <h3 className="font-bold text-ocean text-lg mb-4">{t.legalTitle}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="text-ocean/50">{t.legalFullNameLabel}</dt>
                <dd className="text-ocean/80 mt-0.5">{t.legalFullName}</dd>
              </div>
              <div>
                <dt className="text-ocean/50">{t.bsnLabel}</dt>
                <dd className="text-ocean/80 mt-0.5">010240004070</dd>
              </div>
              <div>
                <dt className="text-ocean/50">{t.directorLabel}</dt>
                <dd className="text-ocean/80 mt-0.5">{t.director}</dd>
              </div>
              <div>
                <dt className="text-ocean/50">{t.founderLabel}</dt>
                <dd className="text-ocean/80 mt-0.5">{t.founder}</dd>
              </div>
            </dl>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
