import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getSiteOrganization, localizedOrganization } from "@/lib/organization";
import { telHref } from "@/lib/contactLinks";
import { getSiteText } from "@/lib/orgContent";
import SectionTitle from "@/components/SectionTitle";
import FadeIn from "@/components/FadeIn";
import DraftForm from "@/components/DraftForm";
import type { Locale } from "@/i18n/routing";

const meta: Record<Locale, { title: string; about: string }> = {
  kk: { title: "Байланыс", about: "мекенжай, телефон, жұмыс уақыты" },
  ru: { title: "Контакты", about: "адрес, телефон, часы работы" },
};

/** The search snippet names the institution and its address from its card (Админка → Настройки). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const organization = await getSiteOrganization();
  const name = organization && localizedOrganization(organization, locale, "name");
  const address = organization && localizedOrganization(organization, locale, "address");
  const description = [name ? `${name}: ${meta[locale].about}.` : null, address].filter(Boolean).join(" ");
  return { title: meta[locale].title, ...(description ? { description } : {}) };
}

const content = {
  kk: {
    title: "Байланыс",
    subtitle: "Бізбен хабарласыңыз",
    addressTitle: "Мекенжай",
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
    bsnLabel: "БСН",
    directorLabel: "Басшысы",
    founderLabel: "Құрылтайшы",
  },
  ru: {
    title: "Контакты",
    subtitle: "Свяжитесь с нами",
    addressTitle: "Адрес",
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
    bsnLabel: "БИН",
    directorLabel: "Руководитель",
    founderLabel: "Учредитель",
  },
} satisfies Record<Locale, unknown>;

export default async function ContactsPage() {
  const locale = (await getLocale()) as Locale;
  const t = content[locale];
  // Address, phone and email come from the institution card; the hours, the
  // rehearsal schedule and the legal details come from the editable texts.
  const text = await getSiteText(locale);
  const rehearsals = [1, 2].map((n) => ({
    day: text(`contacts.rehearsal${n}Day`),
    time: text(`contacts.rehearsal${n}Time`),
  }));
  const organization = await getSiteOrganization();
  // The institution's own address from its card; a dash until it is filled in, never another's.
  const address = (organization && localizedOrganization(organization, locale, "address")) ?? "—";
  const requisites = organization
    ? [
        { label: t.legalFullNameLabel, value: localizedOrganization(organization, locale, "legalName") },
        { label: t.bsnLabel, value: organization.bin },
        { label: t.directorLabel, value: organization.director },
        { label: t.founderLabel, value: localizedOrganization(organization, locale, "founder") },
      ].filter((row): row is { label: string; value: string } => Boolean(row.value))
    : [];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionTitle title={t.title} subtitle={t.subtitle} />
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <FadeIn>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.addressTitle}</h3>
                  <p className="text-ocean/70 whitespace-pre-line">{address}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.phoneTitle}</h3>
                  {organization?.phone ? (
                    <a href={telHref(organization.phone)} className="text-ocean/70 hover:text-gold transition-colors">
                      {organization.phone}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.emailTitle}</h3>
                  {organization?.email ? (
                    <a href={`mailto:${organization.email}`} className="text-ocean/70 hover:text-gold transition-colors">
                      {organization.email}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-dark">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-ocean/10 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-ocean mb-1">{t.hoursTitle}</h3>
                  <p className="text-ocean/70">{text("contacts.hours")}</p>
                  <p className="text-ocean/70">{text("contacts.lunch")}</p>
                  <p className="text-ocean/50 text-sm mt-1">{text("contacts.weekend")}</p>
                </div>
              </div>
            </div>
          </div>
          </FadeIn>

          <FadeIn delay={150}>
          <div className="space-y-4 sm:space-y-6">
            {organization?.email && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-cream-dark">
              <h3 className="font-bold text-ocean text-lg mb-4">{t.formTitle}</h3>
              <DraftForm
                draftKey="contact-message"
                className="space-y-4"
                action={`mailto:${organization.email}`}
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
              </DraftForm>
            </div>
            )}

            <div className="bg-gold/10 rounded-3xl p-6 border border-gold/20">
              <h3 className="font-bold text-ocean mb-2">{t.rehearsalTitle}</h3>
              <ul className="space-y-2 text-ocean/70 text-sm">
                {rehearsals.map((r) => (
                  <li key={r.day} className="flex justify-between">
                    <span>{r.day}</span>
                    <span className="font-medium">{r.time}</span>
                  </li>
                ))}
              </ul>
              <p className="text-ocean/50 text-xs mt-3">
                {text("contacts.rehearsalNote")}
              </p>
            </div>
          </div>
          </FadeIn>
        </div>

        {requisites.length > 0 && (
        <FadeIn delay={250}>
          <div className="mt-6 sm:mt-8 bg-white rounded-3xl p-6 shadow-sm border border-cream-dark">
            <h3 className="font-bold text-ocean text-lg mb-4">{t.legalTitle}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {requisites.map((row) => (
                <div key={row.label}>
                  <dt className="text-ocean/50">{row.label}</dt>
                  <dd className="text-ocean/80 mt-0.5">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeIn>
        )}
      </div>
    </section>
  );
}
