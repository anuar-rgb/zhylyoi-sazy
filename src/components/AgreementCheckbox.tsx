"use client";

import { Link } from "@/i18n/navigation";

export type AgreementText = { before: string; link: string; after: string; href: string };

/**
 * One tick on a public form with its document linked inside the sentence: «Принимаю условия
 * [публичной оферты]», «…в соответствии с [Политикой конфиденциальности]». The document opens in a
 * new tab, so the seats or the form filled in so far stay where they are. A click on the link opens
 * it and does not tick the box.
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
        {text.before}
        <Link href={text.href} target="_blank" className="text-ocean underline underline-offset-2 hover:text-gold">
          {text.link}
        </Link>
        {text.after}
      </span>
    </label>
  );
}
