"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionToast, useFeedback } from "@/components/feedback/FeedbackProvider";
import { assignCategoryColors } from "@/components/SeatMap";
import { categoryLabel, isBuiltInCategory } from "@/lib/seatCategories";
import { addHallCategory, deleteHallCategory, renameHallCategory, saveHallPrices, type FormState } from "./actions";

const INPUT =
  "w-full px-4 py-2.5 border border-cream-dark rounded-2xl bg-cream/30 text-base sm:text-sm text-ocean " +
  "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent";
const SMALL_BUTTON = "text-xs font-semibold transition-colors disabled:opacity-50";

/** «1 место», «3 места», «5 мест», «11 мест». */
function seatsWord(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const word = last === 1 && lastTwo !== 11 ? "место" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "места" : "мест";
  return `${n} ${word}`;
}

/**
 * The hall's seat categories in one place: each with its seat count and default price, custom
 * ones renamed or removed here (their seats then become Стандарт), and new ones added with a
 * price. Стандарт and VIP are always there and cannot be removed.
 */
export default function HallCategoriesForm({
  hallId,
  categories,
  prices,
  seatCounts,
}: {
  hallId: string;
  categories: string[];
  prices: Record<string, number>;
  seatCounts: Record<string, number>;
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveHallPrices, { error: null });
  useActionToast(state, "Цены сохранены");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const colors = assignCategoryColors(categories);

  async function rename(from: string) {
    setBusy(true);
    const result = await renameHallCategory(hallId, from, newName);
    setBusy(false);
    if (result.ok) {
      feedback.success("Категория переименована");
      setRenaming(null);
      router.refresh();
    } else feedback.error(result.error ?? "Не удалось переименовать.");
  }

  async function remove(category: string) {
    const seats = seatCounts[category] ?? 0;
    const confirmed = await feedback.confirm({
      title: `Удалить категорию «${categoryLabel(category)}»?`,
      message:
        seats > 0
          ? `Её места (${seatsWord(seats)}) станут «Стандарт», а её цена удалится. Уже созданные мероприятия это не изменит.`
          : "Её цена удалится. Мест в этой категории нет.",
      confirmLabel: seats > 0 ? "Удалить и перевести в Стандарт" : "Удалить",
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    const result = await deleteHallCategory(hallId, category);
    setBusy(false);
    if (result.ok) {
      feedback.success(result.moved > 0 ? `Категория удалена, ${seatsWord(result.moved)} теперь «Стандарт»` : "Категория удалена");
      router.refresh();
    } else feedback.error(result.error ?? "Не удалось удалить.");
  }

  async function add() {
    setBusy(true);
    const result = await addHallCategory(hallId, addName, addPrice);
    setBusy(false);
    if (result.ok) {
      feedback.success(`Категория «${categoryLabel(result.category!)}» добавлена`);
      setAddName("");
      setAddPrice("");
      router.refresh();
    } else feedback.error(result.error ?? "Не удалось добавить.");
  }

  return (
    <div className="space-y-6">
      {/* Keyed on the data, so the price fields show the saved values again after a refresh. */}
      <form key={JSON.stringify([categories, prices])} action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={hallId} />
        {state.error && (
          <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{state.error}</p>
        )}

        <ul className="divide-y divide-cream-dark">
          {categories.map((category) => {
            const builtIn = isBuiltInCategory(category);
            const color = colors.get(category)?.solid.split(" ")[0] ?? "bg-ocean";
            return (
              <li key={category} className="py-3 first:pt-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 basis-56">
                  <span className={`inline-block w-3.5 h-3.5 rounded-full shrink-0 ${color}`} aria-hidden />
                  {renaming === category ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          rename(category);
                        }
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      aria-label="Новое название"
                      className={`${INPUT} py-1.5`}
                    />
                  ) : (
                    <span className="font-semibold text-ocean break-words">{categoryLabel(category)}</span>
                  )}
                  {builtIn && renaming !== category && (
                    <span className="text-[11px] text-ocean/40 bg-cream/60 rounded-full px-2 py-0.5 shrink-0">базовая</span>
                  )}
                </div>

                <span className="text-sm text-ocean/50 w-20 shrink-0">{seatsWord(seatCounts[category] ?? 0)}</span>

                <div className="relative w-36 shrink-0">
                  <input
                    name={`price:${category}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    defaultValue={prices[category] ?? ""}
                    placeholder="цена"
                    aria-label={`Цена: ${categoryLabel(category)}`}
                    className={`${INPUT} pr-9 py-2`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ocean/40">₸</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 sm:w-48 justify-end">
                  {builtIn ? null : renaming === category ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => rename(category)} className={`${SMALL_BUTTON} text-ocean hover:text-gold-dark`}>
                        Сохранить
                      </button>
                      <button type="button" onClick={() => setRenaming(null)} className={`${SMALL_BUTTON} text-ocean/40 hover:text-ocean`}>
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRenaming(category);
                          setNewName(category);
                        }}
                        className={`${SMALL_BUTTON} text-ocean/60 hover:text-ocean`}
                      >
                        Переименовать
                      </button>
                      <button type="button" disabled={busy} onClick={() => remove(category)} className={`${SMALL_BUTTON} text-ocean/40 hover:text-red-600`}>
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-ocean/40">
          0 — бесплатно. Пустая цена — её зададут у мероприятия. Новое мероприятие в этом зале получит эти цены и
          категории мест сразу; у уже созданных мероприятий они меняются только кнопкой «Взять места и цены из зала».
        </p>

        <button type="submit" disabled={pending} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
          {pending ? "Сохранение…" : "Сохранить цены"}
        </button>
      </form>

      <div className="border-t border-cream-dark pt-5">
        <p className="text-sm font-semibold text-ocean mb-3">Новая категория</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 basis-48 text-xs text-ocean/60">
            Название
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="например: Ложа"
              maxLength={40}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="w-36 text-xs text-ocean/60">
            Цена, ₸
            <input
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="0 — бесплатно"
              className={`${INPUT} mt-1`}
            />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={busy || !addName.trim() || addPrice.trim() === ""}
            className="btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
        <p className="text-xs text-ocean/40 mt-2">
          Затем выберите места на схеме выше и назначьте им эту категорию. «вип», «Vip» и «VIP» — это одна категория VIP.
        </p>
      </div>
    </div>
  );
}
