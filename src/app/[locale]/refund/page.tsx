import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getSiteText } from "@/lib/orgContent";
import { getSiteOrganization, localizedOrganization, siteBrand } from "@/lib/organization";
import { REFUND_RULES_TEXT, fillRefundRules, parseRefundRules } from "@/lib/refundRules";
import BackHomeLink from "@/components/BackHomeLink";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return { title: REFUND_RULES_TEXT[locale].title };
}

/**
 * The institution's ticket refund rules, which a buyer accepts before paying. The text is the
 * institution's own (Тексты сайта → Правила возврата билетов), on the lawyer's model; its name,
 * site, mail and address come from the card, so they stay right when the card changes.
 */
export default async function RefundRulesPage() {
  const locale = (await getLocale()) as Locale;
  const [text, organization] = await Promise.all([getSiteText(locale), getSiteOrganization()]);
  const t = REFUND_RULES_TEXT[locale];

  const name = organization ? siteBrand(organization, locale).fullName : "";
  const address = organization ? (localizedOrganization(organization, locale, "address") ?? "") : "";
  const phone = organization?.phone ?? "";
  const email = organization?.email ?? "";
  const hours = text("refundRules.hours").trim();
  const approval = text("refundRules.approval").trim();

  const blocks = parseRefundRules(
    fillRefundRules(text("refundRules.text"), {
      name,
      site: organization?.domain ?? "",
      email,
      address,
      percent: text("refundRules.percent"),
    })
  );

  const contacts = [
    { label: t.labels.name, value: name },
    { label: t.labels.address, value: address },
    { label: t.labels.phone, value: phone },
    { label: t.labels.email, value: email },
    { label: t.labels.hours, value: hours },
  ].filter((row) => row.value);

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackHomeLink locale={locale} />
        <article className="bg-white rounded-3xl border border-cream-dark shadow-sm px-5 py-7 sm:px-10 sm:py-10 text-ocean/80">
          <header className="text-center mb-8">
            {approval && <p className="text-xs sm:text-sm text-ocean/55 mb-4 break-words">{t.approved(approval)}</p>}
            <h1 className="text-lg sm:text-2xl font-bold text-ocean leading-snug break-words">{t.title}</h1>
            {name && <p className="mt-1 text-sm sm:text-base font-semibold text-ocean/70 break-words">{t.subtitle(name)}</p>}
          </header>

          <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed break-words">
            {blocks.map((block, i) =>
              block.type === "heading" ? (
                <h2 key={i} className="pt-5 text-base sm:text-lg font-bold text-ocean">
                  {block.text}
                </h2>
              ) : (
                <p key={i} className={block.type === "item" ? "pl-4 sm:pl-6" : undefined}>
                  {block.text}
                </p>
              )
            )}
          </div>

          {contacts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-cream-dark text-sm sm:text-[15px]">
              <h2 className="text-base sm:text-lg font-bold text-ocean mb-3">{t.contacts}</h2>
              <dl className="space-y-1.5">
                {contacts.map((row) => (
                  <div key={row.label} className="break-words">
                    <dt className="inline text-ocean/55">{row.label}: </dt>
                    <dd className="inline">
                      {row.label === t.labels.email ? (
                        <a href={`mailto:${row.value}`} className="text-ocean underline underline-offset-2 hover:text-gold break-all">
                          {row.value}
                        </a>
                      ) : row.label === t.labels.phone ? (
                        <a href={`tel:${row.value.replace(/[^\d+]/g, "")}`} className="text-ocean underline underline-offset-2 hover:text-gold">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
