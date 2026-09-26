import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPaymentMethods, listPaymentProviders } from "@/lib/paymentMethods";
import PaymentMethodForm from "../PaymentMethodForm";
import { createPaymentMethod } from "../actions";

export default async function NewPaymentMethodPage() {
  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/payments");

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  if (!organizationId) redirect("/admin/tickets/payments");

  const [allProviders, existing] = await Promise.all([listPaymentProviders(), listPaymentMethods(organizationId)]);
  const usedCodes = new Set(existing.map((m) => m.providerCode));
  const availableProviders = allProviders.filter((p) => !usedCodes.has(p.code));

  if (availableProviders.length === 0) {
    redirect("/admin/tickets/payments");
  }

  return (
    <PaymentMethodForm
      providers={availableProviders}
      organizationId={organizationId}
      action={createPaymentMethod}
      heading="Новый способ оплаты"
    />
  );
}
