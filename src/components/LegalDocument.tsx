import { Fragment } from "react";
import { LEGAL_DOCS, formatEdition, parseLegalText, type LegalDocId } from "@/lib/legalDocs";
import type { Locale } from "@/i18n/routing";

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/** Text with any email address in it made a mailto link (the support address in the requisites). */
function withLinks(text: string) {
  return text.split(EMAIL).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${part}`} className="text-ocean underline underline-offset-2 hover:text-gold break-all">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

const NOTE: Record<Locale, (edition: string) => string> = {
  kk: (edition) => `Редакция: ${edition}`,
  ru: (edition) => `Редакция от ${edition}`,
};

/**
 * One of the platform's documents (the offer, the terms, the privacy policy) as a readable page.
 * The text is the lawyer's, in Russian; the Kazakh site says a Kazakh version is being prepared and
 * shows the same text, marked lang="ru" so screen readers and translators read it right.
 */
export default function LegalDocument({ id, locale }: { id: LegalDocId; locale: Locale }) {
  const doc = LEGAL_DOCS[id];
  const { title, blocks } = parseLegalText(doc.text);

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {locale === "kk" && (
          <p className="mb-6 text-sm text-ocean bg-gold/10 border border-gold/30 rounded-2xl px-4 py-3">
            Құжаттың қазақ тіліндегі нұсқасы дайындалуда. Төменде орыс тіліндегі мәтіні берілген.
          </p>
        )}

        <article lang="ru" className="bg-white rounded-3xl border border-cream-dark shadow-sm px-5 py-7 sm:px-10 sm:py-10 text-ocean/80">
          <header className="text-center mb-8">
            <h1 className="text-lg sm:text-2xl font-bold text-ocean leading-snug break-words">{title[0]}</h1>
            {title.slice(1).map((line) => (
              <p key={line} className="mt-1 text-sm sm:text-base font-semibold text-ocean/70 break-words">
                {line}
              </p>
            ))}
            <p className="mt-3 text-xs text-ocean/50">{NOTE[locale](formatEdition(doc.version, locale))}</p>
          </header>

          <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed break-words">
            {blocks.map((block, index) => {
              switch (block.type) {
                case "section":
                  return (
                    <h2 key={index} className="pt-5 text-base sm:text-lg font-bold text-ocean">
                      {block.text}
                    </h2>
                  );
                case "subsection":
                  return (
                    <h3 key={index} className="pt-2 font-semibold text-ocean">
                      {block.text}
                    </h3>
                  );
                case "list":
                  return (
                    <ul key={index} className="space-y-1.5 pl-4 sm:pl-6">
                      {block.items.map((item) => (
                        <li key={item}>{withLinks(item)}</li>
                      ))}
                    </ul>
                  );
                default:
                  return (
                    <p key={index}>
                      {block.term && <strong className="font-semibold text-ocean">{block.term}</strong>}
                      {block.term && " — "}
                      {withLinks(block.text)}
                    </p>
                  );
              }
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
