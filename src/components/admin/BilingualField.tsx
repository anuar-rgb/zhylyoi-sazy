const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/**
 * One field the admin actually fills — in Kazakh, the site's default language —
 * plus the Russian translation folded under a native `<details>`, collapsed by
 * default. Saving the form with that section untouched leaves the Russian input
 * empty, and the server action fills it in automatically; opening the section
 * shows whatever is already there (freshly translated or entered by hand before)
 * so a wrong word can still be fixed without hunting through two columns.
 *
 * Not a client component: a native `<details>` needs no state, so this works
 * inside any form regardless of whether that form itself is client or server.
 */
export default function BilingualField({
  kkName,
  ruName,
  label,
  defaultKk,
  defaultRu,
  textarea,
  rows = 3,
  placeholderKk,
  placeholderRu,
  className = "",
}: {
  kkName: string;
  ruName: string;
  label: string;
  defaultKk?: string | null;
  defaultRu?: string | null;
  textarea?: boolean;
  rows?: number;
  placeholderKk?: string;
  placeholderRu?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={LABEL} htmlFor={kkName}>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={kkName}
          name={kkName}
          rows={rows}
          defaultValue={defaultKk ?? ""}
          placeholder={placeholderKk}
          className={`${INPUT} resize-y`}
        />
      ) : (
        <input id={kkName} name={kkName} defaultValue={defaultKk ?? ""} placeholder={placeholderKk} className={INPUT} />
      )}

      <details className="mt-1.5">
        <summary className="text-[11px] font-medium text-ocean/40 cursor-pointer select-none hover:text-ocean">
          Перевод на русский {defaultRu ? "" : "— заполнится сам при сохранении"}
        </summary>
        <div className="mt-1.5">
          <label className="sr-only" htmlFor={ruName}>
            {label} (ru)
          </label>
          {textarea ? (
            <textarea
              id={ruName}
              name={ruName}
              rows={rows}
              defaultValue={defaultRu ?? ""}
              placeholder={placeholderRu}
              className={`${INPUT} resize-y`}
            />
          ) : (
            <input id={ruName} name={ruName} defaultValue={defaultRu ?? ""} placeholder={placeholderRu} className={INPUT} />
          )}
          <p className="text-[11px] text-ocean/40 mt-1">
            Оставьте пустым, чтобы перевод сделался автоматически. Заполните, чтобы задать его вручную — например,
            когда нужно сохранить конкретную формулировку или имя собственное.
          </p>
        </div>
      </details>
    </div>
  );
}
