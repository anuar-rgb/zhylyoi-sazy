"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { translateFieldPair } from "@/lib/autoTranslate";

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
  if (id) revalidatePath(`/admin/tickets/halls/${id}`);
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
  const category = field(form, "category") ?? "standard";

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
  // collide with the (hall_id, row_label, seat_number) unique index, so this
  // insert only fails on a genuine database error, same risk as any other
  // two-step admin write in this codebase.
  const seats: { hall_id: string; row_label: string; seat_number: number; category: string }[] = [];
  for (let r = 1; r <= rows; r++) {
    const rowLabel = rowFormat === "letter" ? letterLabel(r) : String(r);
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({ hall_id: created.id, row_label: rowLabel, seat_number: s, category });
    }
  }
  const { error: seatsError } = await supabase.from("hall_seats").insert(seats);
  if (seatsError) {
    return { error: "Зал создан, но не удалось создать сетку мест. Задайте её на странице зала через «Изменить»." };
  }

  revalidateHalls();
  await flash("Добавлено");
  redirect(`/admin/tickets/halls/${created.id}`);
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
 */
export async function regenerateSeatGrid(_prev: FormState, form: FormData): Promise<FormState> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { error: "Профиль сотрудника не настроен." };

  const hallId = field(form, "id");
  if (!hallId) return { error: "Зал не найден." };

  const rows = intField(form, "rows");
  const seatsPerRow = intField(form, "seats_per_row");
  if (!rows && !seatsPerRow) return { error: null }; // both left blank — no grid change requested
  if (!rows || rows < 1 || rows > 200) return { error: "Число рядов — от 1 до 200." };
  if (!seatsPerRow || seatsPerRow < 1 || seatsPerRow > 200) return { error: "Число мест в ряду — от 1 до 200." };

  const rowFormat = field(form, "row_format") === "number" ? "number" : "letter";
  const category = field(form, "category") ?? "standard";

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("hall_seats")
    .select("id, row_label, seat_number, is_active")
    .eq("hall_id", hallId);
  if (fetchError) return { error: "Не удалось прочитать текущие места." };

  const existingByKey = new Map((existing ?? []).map((s) => [`${s.row_label}#${s.seat_number}`, s]));
  const targetKeys = new Set<string>();
  const toInsert: { hall_id: string; row_label: string; seat_number: number; category: string }[] = [];
  const toReactivate: string[] = [];

  for (let r = 1; r <= rows; r++) {
    const rowLabel = rowFormat === "letter" ? letterLabel(r) : String(r);
    for (let s = 1; s <= seatsPerRow; s++) {
      const key = `${rowLabel}#${s}`;
      targetKeys.add(key);
      const seat = existingByKey.get(key);
      if (!seat) toInsert.push({ hall_id: hallId, row_label: rowLabel, seat_number: s, category });
      else if (!seat.is_active) toReactivate.push(seat.id);
    }
  }

  const toDeactivate = (existing ?? [])
    .filter((s) => s.is_active && !targetKeys.has(`${s.row_label}#${s.seat_number}`))
    .map((s) => s.id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("hall_seats").insert(toInsert);
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

/** One seat or many at once — SeatBulkPanel calls this the same way either way. */
export async function updateSeatsCategory(ids: string[], category: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const trimmed = category.trim();
  if (!trimmed || ids.length === 0) return { ok: false };

  const { error, count } = await supabase
    .from("hall_seats")
    .update({ category: trimmed }, { count: "exact" })
    .in("id", ids);

  if (!error && count === ids.length) revalidatePath("/admin/tickets/halls", "layout");
  return { ok: !error && count === ids.length };
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
