"use client";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const LABEL = "block text-sm font-medium text-ocean/70 mb-1.5";

/**
 * Rows/seats-per-row/row-format/category inputs shared between creating a hall
 * (required — a brand new hall needs an initial layout) and resizing an
 * existing one (optional — blank means "don't touch the grid"). No <form> or
 * submit button of its own: the caller owns those, since the two use cases
 * submit to different actions.
 */
export default function GridFieldset({ required = false }: { required?: boolean }) {
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
            min={1}
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
            min={1}
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

      <div className="sm:w-1/2 sm:pr-2">
        <label className={LABEL} htmlFor="category">
          Категория новых мест
        </label>
        <input id="category" name="category" defaultValue="standard" placeholder="standard" className={INPUT} />
        <p className="text-xs text-ocean/40 mt-1.5">
          Применяется только к местам, которых ещё не было. Уже существующие места сохраняют свою категорию.
        </p>
      </div>
    </>
  );
}
