"use client";

/**
 * Sends the text of one field to Google Translate in a new tab.
 *
 * Deliberately a link rather than an API call: a translation service needs an
 * account with a card attached even on its free tier, and the institution writes a
 * few thousand characters a month. A link costs nothing, depends on nothing, and
 * cannot stop working because a quota changed. The translation is pasted back by
 * hand, which is right anyway — machine Kazakh needs a human eye before it is
 * published under the institution's name.
 *
 * Reads the live value out of the surrounding form, so it picks up what the person
 * has just typed rather than what the page was rendered with.
 */
const MAX_URL_TEXT = 1800;

function valueOf(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  if (!field) return "";
  // A radio group would come back as a collection; our fields never do.
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) return field.value.trim();
  return "";
}

export default function TranslateRow({
  kk,
  ru,
  className = "",
}: {
  /** Name of the Kazakh field. */
  kk: string;
  /** Name of the Russian field. */
  ru: string;
  className?: string;
}) {
  function open(from: string, sl: "kk" | "ru", tl: "kk" | "ru") {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      const form = event.currentTarget.form;
      if (!form) return;

      const text = valueOf(form, from);
      if (!text) {
        alert("Поле пустое — нечего переводить.");
        return;
      }

      const url =
        `https://translate.google.com/?op=translate&sl=${sl}&tl=${tl}` +
        `&text=${encodeURIComponent(text.slice(0, MAX_URL_TEXT))}`;
      window.open(url, "_blank", "noopener,noreferrer");
    };
  }

  const LINK = "text-[11px] font-medium text-ocean/40 hover:text-gold-dark transition-colors";

  return (
    <p className={`text-[11px] text-ocean/30 ${className}`}>
      Перевести:{" "}
      <button type="button" onClick={open(kk, "kk", "ru")} className={LINK}>
        каз → рус
      </button>
      {" · "}
      <button type="button" onClick={open(ru, "ru", "kk")} className={LINK}>
        рус → каз
      </button>
      {" — откроется переводчик, результат вставьте сами"}
    </p>
  );
}
