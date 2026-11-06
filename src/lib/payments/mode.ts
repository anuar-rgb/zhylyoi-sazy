import { createAdminClient } from "@/lib/supabase/admin";
import { isMockEnabled } from "./dev";

/**
 * Whether an event's orders are paid through the bank alone, with nothing for a cashier to confirm:
 * the same choice of methods as the order page makes (the event's own, or all the institution's
 * enabled ones). For the server's own use, where the caller may not be able to read the methods.
 */
export async function isBankOnlyEvent(eventId: string, organizationId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data: event } = await admin.from("culture_events").select("payment_method_id").eq("id", eventId).maybeSingle();
  const { data } = await admin
    .from("organization_payment_methods")
    .select("id, provider_code, mode")
    .eq("organization_id", organizationId)
    .eq("is_enabled", true);

  const enabled = (data ?? []).filter((method) => isMockEnabled() || method.provider_code !== "mock");
  const own = enabled.filter((method) => method.id === event?.payment_method_id);
  const methods = own.length > 0 ? own : enabled;
  return methods.length > 0 && methods.every((method) => method.mode === "api");
}
