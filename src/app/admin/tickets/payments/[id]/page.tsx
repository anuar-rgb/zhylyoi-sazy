import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import { getBankConnection } from "@/lib/payments/keys";
import { hasProvider } from "@/lib/payments/registry";
import PaymentMethodForm from "../PaymentMethodForm";
import BankConnectionForm from "../BankConnectionForm";
import { updatePaymentMethod } from "../actions";

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/payments");

  // RLS decides visibility, so a method belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const method = await getPaymentMethodById(id);
  if (!method) notFound();

  // Keys are shown only to the institution they belong to (or a platform admin).
  const ownsMethod = !identity.organizationId || identity.organizationId === method.organizationId;
  const connection = ownsMethod ? await getBankConnection(method.id) : null;

  return (
    <>
      <PaymentMethodForm
        method={method}
        providers={[]}
        organizationId={method.organizationId}
        action={updatePaymentMethod}
        heading={method.displayNameRu ?? method.displayNameKk ?? method.providerName}
      />
      {connection && (
        <BankConnectionForm
          methodId={method.id}
          providerName={method.providerName}
          integrationReady={hasProvider(method.providerCode)}
          serverReady={connection.serverReady}
          hasSecret={connection.hasSecret}
          merchantId={connection.merchantId}
        />
      )}
    </>
  );
}
