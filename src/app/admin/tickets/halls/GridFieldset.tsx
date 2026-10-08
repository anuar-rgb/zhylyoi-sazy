"use client";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/**
 * Rows/seats-per-row/row-format inputs shared between creating a hall
 * (required — a brand new hall needs an initial layout) and resizing an
 * existing one (optional — blank means "don't touch the grid"). No category:
 * every new seat starts as Стандарт, and VIP is set seat by seat on the hall's
 * edit page. No <form> or
 * submit button of its own: the caller owns those, since the two use cases
 * submit to different actions.
 */
export default function GridFieldset({
  required = false,
  allowZeroRows = false,
}: {
  required?: boolean;
  /** 0 rows removes a side section or the balcony; the parter always keeps at least one. */
  allowZeroRows?: boolean;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="rows">
            Число рядов
          </label>
          <input
            id="rows"
            name="rows"
            type="number"
            min={allowZeroRows ? 0 : 1}
            max={200}
            required={required}
            defaultValue={required ? 10 : ""}
            placeholder={required ? undefined : "не менять"}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="seats_per_row">
            Мест в ряду
          </label>
          <input
            id="seats_per_row"
            name="seats_per_row"
            type="number"
            // 0 is allowed alongside 0 rows: removing a section, people type 0 in both fields.
            min={allowZeroRows ? 0 : 1}
            max={200}
            required={required}
            defaultValue={required ? 20 : ""}
            placeholder={required ? undefined : "не менять"}
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <p className={LABEL}>Обозначение ряда</p>
        <div className="flex gap-4 text-sm text-ocean/80">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="row_format" value="letter" defaultChecked className="accent-ocean" />
            Буквы (A, B, C…)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="row_format" value="number" className="accent-ocean" />
            Числа (1, 2, 3…)
          </label>
        </div>
      </div>
    </>
  );
}
