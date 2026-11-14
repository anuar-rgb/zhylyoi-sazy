"use client";

import { Link } from "@/i18n/navigation";

/**
 * A tick's sentence: plain words and links to the documents it accepts, in reading order, e.g.
 * ["Принимаю условия ", { text: "публичной оферты", href: "/offer" }, " и ", { text: "правила посещения", href: "/rules" }].
 */
export type AgreementText = (string | { text: string; href: string })[];

/**
 * One tick on a public form with its documents linked inside the sentence. A document opens in a new
 * tab, so the seats or the form filled in so far stay where they are. A click on a link opens it and
 * does not tick the box.
 */
export default function AgreementCheckbox({
  checked,
  onChange,
  text,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  text: AgreementText;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ocean/70 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-ocean shrink-0" />
      <span>
        {text.map((part, i) =>
          typeof part === "string" ? (
            part
          ) : (
            <Link key={i} href={part.href} target="_blank" className="text-ocean underline underline-offset-2 hover:text-gold">
              {part.text}
            </Link>
          )
        )}
      </span>
    </label>
  );
}
