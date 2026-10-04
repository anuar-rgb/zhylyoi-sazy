"use server";

import { revalidatePath } from "next/cache";
import { getStaffIdentity } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Records that the money for a payment has been returned to the buyer OUTSIDE this site, through
 * the bank's own cabinet. The site never moves money back by itself and never pretends to: this
 * only reflects, once a person says the refund happened, what already happened at the bank.
 *
 * Effect (apply_refund, one transaction): the payment becomes "refunded", the order becomes
 * "refunded", the seats go back on sale and the tickets stop working at the door.
 *
 * The caller must be staff of the payment's own institution. The change itself needs the
 * service-role key because no signed-in role may update payments.
 */
export async function markPaymentRefunded(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) return { ok: false, error: "Профиль сотрудника не настроен." };

  // Read through the staff member's own client: row-level security hides other institutions.
  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, organization_id, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Платёж не найден." };
  if (identity.organizationId && identity.organizationId !== payment.organization_id) {
    return { ok: false, error: "Недостаточно прав." };
  }
  if (payment.status !== "success" && payment.status !== "refund_pending") {
    return { ok: false, error: "Вернуть можно только оплаченный платёж." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "На сервере не задан служебный ключ." };

  const { data, error } = await admin.rpc("apply_refund", { p_payment_id: paymentId });
  const result = (data as { result: string }[] | null)?.[0]?.result;
  if (error || (result !== "refunded" && result !== "already_refunded")) {
    return { ok: false, error: "Не удалось отметить возврат." };
  }

  await admin.from("payments").update({ note: "refunded_manually_by_staff" }).eq("id", paymentId);

  revalidatePath("/admin/tickets/transactions");
  revalidatePath("/admin/tickets/orders");
  revalidatePath("/admin/tickets/stats");
  return { ok: true };
}
