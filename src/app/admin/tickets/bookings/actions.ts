"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmBookingPayment(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не авторизовано." };

  const { error, count } = await supabase
    .from("bookings")
    .update(
      { status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: user.id },
      { count: "exact" }
    )
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Не удалось подтвердить оплату." };
  // RLS (is_staff_of + status in ('pending','confirmed')) and the .eq('status','pending')
  // filter above both narrow this to zero rows silently rather than refusing an
  // unauthorized or already-settled request — say so instead of reading it as success.
  if (count === 0) return { ok: false, error: "Бронь уже не ожидает оплаты, либо недостаточно прав." };

  revalidatePath("/admin/tickets/bookings");
  return { ok: true };
}
