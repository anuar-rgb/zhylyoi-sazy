"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";
import { STANDARD, categoryLabel, isBuiltInCategory, normalizeCategory } from "@/lib/seatCategories";
import { listHallCategories } from "@/lib/halls";
import { PARTER, SECTIONS, sectionLabel, toSection, type HallSection } from "@/lib/hallSections";

export type FormState = { error: string | null };

/** A trimmed value, or null — an empty input means "unknown", not an empty string. */
function field(form: FormData, name: string): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function intField(form: FormData, name: string): number | null {
  const raw = field(form, name);
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function revalidateHalls(id?: string) {
  revalidatePath("/admin/tickets/halls");
  if (id) revalidatePath(`/admin/tickets/halls/${id}/edit`);
}

// ---------------------------------------------------------------------
// Hall
// ---------------------------------------------------------------------

function hallPayload(form: FormData) {
  const nameKk = field(form, "name_kk");
  const nameRu = field(form, "name_ru");

  return {
    name_kk: nameKk,
    name_ru: nameRu,
    is_active: form.get("is_active") === "on",
  };
}

async function fillHallTranslations(data: ReturnType<typeof hallPayload>): Promise<ReturnType<typeof hallPayload>> {
  const [filled] = await translateFieldPair([data], "name_kk", "name_ru");
  return filled;
}

export async function createHall(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const data = await fillHallTranslations(hallPayload(form));
  if (!data.name_kk && !data.name_ru) return { error: "Укажите название зала хотя бы на одном языке." };

  const rows = intField(form, "rows");
  const seatsPerRow = intField(form, "seats_per_row");
  if (!rows || rows < 1 || rows > 200) return { error: "Число рядов — от 1 до 200." };
  if (!seatsPerRow || seatsPerRow < 1 || seatsPerRow > 200) return { error: "Число мест в ряду — от 1 до 200." };
  const rowFormat = field(form, "row_format") === "number" ? "number" : "letter";
  // Every new seat starts as Стандарт; VIP and other categories are set seat by seat on the
  // hall's edit page.
  const category = STANDARD;

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) return { error: "Не удалось определить учреждение." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("halls")
    .insert({ ...data, organization_id: organizationId })
    .select("id")
    .single();

  if (error || !created) return { error: "Не удалось создать зал." };

  // The hall row exists before its seats do — a brand new hall_id can never
  // collide with the (hall_id, section, row_label, seat_number) unique index, so this
  // insert only fails on a genuine database error, same risk as any other
  // two-step admin write in this codebase.
  const seats: SeatInsert[] = gridSeats(created.id, PARTER, rows, seatsPerRow, rowFormat, category);
  for (const section of SECTIONS) {
    if (section === PARTER || form.get(`section_${section}`) !== "on") continue;
    const sectionRows = intField(form, `${section}_rows`);
    const sectionSeats = intField(form, `${section}_seats`);
    if (!sectionRows || sectionRows < 1 || sectionRows > 100 || !sectionSeats || sectionSeats < 1 || sectionSeats > 100) {
      await supabase.from("halls").delete().eq("id", created.id);
      return { error: `${sectionLabel(section)}: рядов и мест в ряду — от 1 до 100.` };
    }
    seats.push(...gridSeats(created.id, section, sectionRows, sectionSeats, rowFormat, category));
  }
  // defaultToNull: false — a parter seat has no section key (see gridSeats), and in a batch
  // supabase-js would otherwise send NULL for it instead of letting the column default apply.
  const { error: seatsError } = await supabase.from("hall_seats").insert(seats, { defaultToNull: false });
  if (seatsError) {
    // No half-made hall left in the list: without its seats it is of no use, and the form still
    // holds everything to try again.
    await supabase.from("halls").delete().eq("id", created.id);
    return {
      error:
        seatsError.code === "42703"
          ? "Сектора ещё не включены в базе: выполните SQL из миграции hall_seats_add_section."
          : "Не удалось создать места зала. Попробуйте ещё раз.",
    };
  }

  revalidateHalls();
  await flash("Зал создан. Отметьте VIP-места и задайте цены");
  redirect(`/admin/tickets/halls/${created.id}/edit`);
}

export async function updateHall(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const id = field(form, "id");
  if (!id) return { error: "Зал не найден." };

  const data = await fillHallTranslations(hallPayload(form));
  if (!data.name_kk && !data.name_ru) return { error: "Укажите название зала хотя бы на одном языке." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("halls").update(data, { count: "exact" }).eq("id", id);

  if (error) return { error: "Не удалось сохранить изменения." };
  // RLS filters rows rather than refusing the statement, so a caller without
  // rights updates nothing and gets no error. Say so instead of pretending.
  if (count === 0) return { error: "Недостаточно прав для редактирования этого зала." };

  revalidateHalls(id);
  return { error: null };
}

export async function deleteHall(id: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const supabase = await createClient();
  const { error, count } = await supabase.from("halls").delete({ count: "exact" }).eq("id", id);

  if (error) return { ok: false, error: "Не удалось удалить зал." };
  if (count === 0) return { ok: false, error: "Недостаточно прав для удаления." };

  // hall_seats cascades in the database — nothing left to clean up here.
  revalidateHalls();
  return { ok: true };
}

// ---------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------

type SeatInsert = { hall_id: string; section?: HallSection; row_label: string; seat_number: number; category: string };

/**
 * The seats of one section's grid. The parter's seats carry no section key at all: the column
 * defaults to the parter, and leaving it out keeps a plain hall creatable on a database that
 * has not had the sections migration yet.
 */
function gridSeats(
  hallId: string,
  section: HallSection,
  rows: number,
  seatsPerRow: number,
  rowFormat: "letter" | "number",
  category: string
): SeatInsert[] {
  const seats: SeatInsert[] = [];
  for (let r = 1; r <= rows; r++) {
    const rowLabel = rowFormat === "letter" ? letterLabel(r) : String(r);
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({ hall_id: hallId, ...(section === PARTER ? {} : { section }), row_label: rowLabel, seat_number: s, category });
    }
  }
  return seats;
}

/** 1 → "A", 26 → "Z", 27 → "AA" — spreadsheet-style, for halls with more than 26 rows. */
function letterLabel(n: number): string {
  let label = "";
  let value = n;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

/**
 * Grows and/or shrinks a hall's grid to the given shape. Never deletes a
 * row — same rule as setSeatsActive below: a seat outside the new shape is
 * deactivated, not removed, because booking_items may already reference it.
 * A seat already inside the new shape is left completely alone (category,
 * active state, everything) — resizing only touches the boundary, never
 * seats staff have already fine-tuned individually.
 *
 * Works on one section at a time (the form says which): adding the balcony or resizing the left
 * side never touches the parter. Rows = 0 hides a whole side section or balcony — the way to
 * remove one; the parter always keeps at least one row.
 */
export async function regenerateSeatGrid(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const hallId = field(form, "id");
  if (!hallId) return { error: "Зал не найден." };
  const section = toSection(field(form, "section"));

  const rows = intField(form, "rows");
  const seatsPerRow = intField(form, "seats_per_row");
  const removing = section !== PARTER && rows === 0;
  if (rows === null && seatsPerRow === null) return { error: null }; // both left blank — no grid change requested
  if (!removing) {
    if (!rows || rows < 1 || rows > 200) {
      return { error: section === PARTER ? "Число рядов — от 1 до 200." : "Число рядов — от 1 до 200, или 0, чтобы убрать сектор." };
    }
    if (!seatsPerRow || seatsPerRow < 1 || seatsPerRow > 200) return { error: "Число мест в ряду — от 1 до 200." };
  }

  const rowFormat = field(form, "row_format") === "number" ? "number" : "letter";
  const category = STANDARD; // seats added by a resize start as Стандарт too

  const supabase = await createClient();
  // Only this section's seats. A database without sections yet has only the parter.
  const read = (withSection: boolean) => {
    const query = supabase.from("hall_seats").select("id, row_label, seat_number, is_active").eq("hall_id", hallId);
    return withSection ? query.eq("section", section) : query;
  };
  let { data: existing, error: fetchError } = await read(true);
  if (fetchError?.code === "42703" && section === PARTER) ({ data: existing, error: fetchError } = await read(false));
  if (fetchError) {
    return {
      error:
        fetchError.code === "42703"
          ? "Сектора ещё не включены в базе: выполните SQL из миграции hall_seats_add_section."
          : "Не удалось прочитать текущие места.",
    };
  }

  const existingByKey = new Map((existing ?? []).map((s) => [`${s.row_label}#${s.seat_number}`, s]));
  const targetKeys = new Set<string>();
  const toInsert: SeatInsert[] = [];
  const toReactivate: string[] = [];

  if (!removing) {
    for (const seat of gridSeats(hallId, section, rows!, seatsPerRow!, rowFormat, category)) {
      const key = `${seat.row_label}#${seat.seat_number}`;
      targetKeys.add(key);
      const found = existingByKey.get(key);
      if (!found) toInsert.push(seat);
      else if (!found.is_active) toReactivate.push(found.id);
    }
  }

  const toDeactivate = (existing ?? [])
    .filter((s) => s.is_active && !targetKeys.has(`${s.row_label}#${s.seat_number}`))
    .map((s) => s.id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("hall_seats").insert(toInsert, { defaultToNull: false });
    if (error) return { error: "Не удалось добавить новые места." };
  }
  if (toReactivate.length > 0) {
    const { error } = await supabase.from("hall_seats").update({ is_active: true }).in("id", toReactivate);
    if (error) return { error: "Не удалось восстановить места." };
  }
  if (toDeactivate.length > 0) {
    const { error } = await supabase.from("hall_seats").update({ is_active: false }).in("id", toDeactivate);
    if (error) return { error: "Не удалось скрыть лишние места." };
  }

  revalidateHalls(hallId);
  return { error: null };
}

/** Every category this hall knows: the two built-in ones, those its seats have, and those added by name. */
const hallCategories = listHallCategories;

/**
 * One seat or many at once — SeatBulkPanel calls this the same way either way. The name is
 * normalized first, so «вип» lands on VIP and «балкон» on an existing «Балкон».
 */
export async function updateSeatsCategory(ids: string[], category: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  if (ids.length === 0) return { ok: false };

  const { data: first } = await supabase.from("hall_seats").select("hall_id").eq("id", ids[0]).maybeSingle();
  const normalized = normalizeCategory(category, first ? await hallCategories(first.hall_id as string) : []);
  if (!normalized) return { ok: false };

  const { error, count } = await supabase
    .from("hall_seats")
    .update({ category: normalized }, { count: "exact" })
    .in("id", ids);

  if (!error && count === ids.length) revalidatePath("/admin/tickets/halls", "layout");
  return { ok: !error && count === ids.length };
}

/** Postgres "undefined_table" / PostgREST "no such table": the hall_categories migration has not been run. */
const NO_TABLE = new Set(["42P01", "PGRST205"]);
const NO_TABLE_MESSAGE = "Категории залов ещё не включены в базе: выполните SQL из миграции hall_categories_without_prices.";

/**
 * Adds a category to the hall by name. It shows in the category list and the seat picker
 * straight away, before any seat has it. The hall has no prices: each event sets its own.
 */
export async function addHallCategory(hallId: string, name: string): Promise<{ ok: boolean; category?: string; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  const existing = await hallCategories(hallId);
  const category = normalizeCategory(name, existing);
  if (!category) return { ok: false, error: "Укажите название категории." };
  if (category.length > 40) return { ok: false, error: "Название — не длиннее 40 символов." };
  // «вип» is VIP, «ложа» is an existing «Ложа»: nothing new to add.
  if (existing.includes(category)) return { ok: false, error: `Категория «${categoryLabel(category)}» уже есть.` };

  const supabase = await createClient();
  const { error } = await supabase.from("hall_categories").insert({ hall_id: hallId, category });
  if (error) return { ok: false, error: NO_TABLE.has(error.code) ? NO_TABLE_MESSAGE : "Не удалось сохранить категорию." };

  revalidateHalls(hallId);
  return { ok: true, category };
}

/**
 * Renames a custom category everywhere in this hall. Renaming onto an existing category merges
 * the two — the seats join it. Стандарт and VIP cannot be renamed.
 */
export async function renameHallCategory(
  hallId: string,
  from: string,
  to: string
): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };
  if (isBuiltInCategory(from)) return { ok: false, error: "Стандарт и VIP переименовать нельзя." };

  const target = normalizeCategory(to, (await hallCategories(hallId)).filter((c) => c !== from));
  if (!target) return { ok: false, error: "Укажите новое название." };
  if (target.length > 40) return { ok: false, error: "Название — не длиннее 40 символов." };
  if (target === from) return { ok: true };

  const supabase = await createClient();
  const { error: seatsError } = await supabase
    .from("hall_seats")
    .update({ category: target })
    .eq("hall_id", hallId)
    .eq("category", from);
  if (seatsError) return { ok: false, error: "Не удалось переименовать." };

  if (!isBuiltInCategory(target)) {
    await supabase
      .from("hall_categories")
      .upsert({ hall_id: hallId, category: target }, { onConflict: "hall_id,category", ignoreDuplicates: true });
  }
  await supabase.from("hall_categories").delete().eq("hall_id", hallId).eq("category", from);

  revalidateHalls(hallId);
  return { ok: true };
}

/**
 * Removes a custom category from the hall: its seats become Стандарт. Events already made keep
 * their own seat categories and prices (see applyHallSeatsToEvent). Стандарт and VIP stay.
 */
export async function deleteHallCategory(hallId: string, category: string): Promise<{ ok: boolean; moved: number; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, moved: 0, error: "Профиль сотрудника не настроен." };
  if (isBuiltInCategory(category)) return { ok: false, moved: 0, error: "Стандарт и VIP удалить нельзя." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("hall_seats")
    .update({ category: STANDARD }, { count: "exact" })
    .eq("hall_id", hallId)
    .eq("category", category);
  if (error) return { ok: false, moved: 0, error: "Не удалось удалить категорию." };
  await supabase.from("hall_categories").delete().eq("hall_id", hallId).eq("category", category);

  revalidateHalls(hallId);
  return { ok: true, moved: count ?? 0 };
}

export async function setSeatsActive(ids: string[], isActive: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  if (ids.length === 0) return { ok: false };

  const { error, count } = await supabase
    .from("hall_seats")
    .update({ is_active: isActive }, { count: "exact" })
    .in("id", ids);

  if (!error && count === ids.length) revalidatePath("/admin/tickets/halls", "layout");
  return { ok: !error && count === ids.length };
}

// No deleteSeat: booking_items.seat_id references hall_seats(id) with no ON
// DELETE CASCADE, so a hard delete of a booked seat would simply fail with a
// foreign key violation rather than losing the booking silently — but that's
// still the wrong failure mode for an admin action. setSeatsActive(ids, false)
// is the only removal a seat gets — see SeatBulkPanel.tsx.
