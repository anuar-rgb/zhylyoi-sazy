import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import PaymentMethodForm from "../PaymentMethodForm";
import { updatePaymentMethod } from "../actions";

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/payments");

  // RLS decides visibility, so a method belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const method = await getPaymentMethodById(id);
  if (!method) notFound();

  return (
    <PaymentMethodForm
      method={method}
      providers={[]}
      organizationId={method.organizationId}
      action={updatePaymentMethod}
      heading={method.displayNameRu ?? method.displayNameKk ?? method.providerName}
    />
  );
}
