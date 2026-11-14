import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** The words around the visiting rules, in both languages. */
export const VISIT_RULES_TEXT: Record<Locale, { title: string; special: string; readBefore: string; link: string }> = {
  kk: {
    title: "Келу ережелері",
    special: "Іс-шараға келудің ерекше шарттары",
    readBefore: "Билет сатып алмас бұрын",
    link: "келу ережелерімен танысыңыз",
  },
  ru: {
    title: "Правила посещения",
    special: "Особые условия посещения",
    readBefore: "Перед покупкой ознакомьтесь с",
    link: "правилами посещения",
  },
};

/** A text written in the admin, one point per line: every non-empty line is a paragraph. */
export function RulesText({ text, className = "space-y-3" }: { text: string; className?: string }) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <p key={i} className="break-words">
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * What a buyer reads before choosing seats: the event's own conditions, if it has any, and the link
 * to the general rules they accept with the offer.
 */
export function EventVisitConditions({ notes, locale, linkRules = true }: { notes: string | null; locale: Locale; linkRules?: boolean }) {
  const t = VISIT_RULES_TEXT[locale];
  if (!notes && !linkRules) return null;
  return (
    <div className="rounded-2xl bg-gold/10 border border-gold/30 px-4 py-3 text-sm text-ocean">
      {notes && (
        <>
          <p className="font-semibold mb-1">{t.special}</p>
          <RulesText text={notes} className="space-y-1 text-ocean/80" />
        </>
      )}
      {linkRules && (
        <p className={notes ? "mt-2 text-ocean/70" : "text-ocean/70"}>
          {t.readBefore}{" "}
          <Link href="/rules" target="_blank" className="font-semibold text-ocean underline underline-offset-2 hover:text-gold-dark">
            {t.link}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
