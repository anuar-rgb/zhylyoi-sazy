/** «Направление нумерации мест» for the whole hall, submitted as seat_numbering. */
export default function NumberingField({ defaultValue = "ltr" }: { defaultValue?: "ltr" | "rtl" }) {
  const options = [
    { value: "ltr", title: "Слева направо", hint: "1, 2, 3… — место №1 у левого края" },
    { value: "rtl", title: "Справа налево", hint: "…3, 2, 1 — место №1 у правого края" },
  ] as const;
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-ocean/70 mb-1.5">Направление нумерации мест</legend>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 p-3 rounded-2xl border border-cream-dark bg-cream/30 cursor-pointer has-[:checked]:border-ocean has-[:checked]:bg-ocean/5"
          >
            <input type="radio" name="seat_numbering" value={option.value} defaultChecked={defaultValue === option.value} className="accent-ocean shrink-0" />
            <span className="text-sm text-ocean">
              <span className="font-semibold block">{option.title}</span>
              <span className="text-xs text-ocean/50">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-ocean/40 mt-1.5">Меняет только то, с какой стороны на схеме место №1. Номера мест в билетах не меняются.</p>
    </fieldset>
  );
}
