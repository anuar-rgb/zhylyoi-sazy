import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import { getBankConnection } from "@/lib/payments/keys";
import { hasProvider } from "@/lib/payments/registry";
import BankConnectionForm from "../BankConnectionForm";
import PaymentMethodForm from "../PaymentMethodForm";
import PaymentModeForm from "../PaymentModeForm";
import { updatePaymentMethod } from "../actions";

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/payments");

  // RLS decides visibility, so a method belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const method = await getPaymentMethodById(id);
  if (!method) notFound();

  // Only for a bank with an integration switched on, and only for the institution the keys belong to.
  const ownsMethod = !identity.organizationId || identity.organizationId === method.organizationId;
  const connection = ownsMethod && hasProvider(method.providerCode) ? await getBankConnection(method.id) : null;

  return (
    <>
      <PaymentMethodForm
        method={method}
        providers={[]}
        action={updatePaymentMethod}
        heading={method.displayNameRu ?? method.displayNameKk ?? method.providerName}
      />
      {connection && (
        <>
          <BankConnectionForm
            methodId={method.id}
            providerName={method.providerName}
            ready={connection.serverReady && connection.keyReady}
            notReadyReason={
              !connection.serverReady
                ? "На сервере не задан служебный ключ (SUPABASE_SERVICE_ROLE_KEY), поэтому данные банка пока сохранить нельзя."
                : !connection.keyReady
                  ? "На сервере не задан PAYMENT_SECRETS_KEY, поэтому данные банка пока сохранить нельзя."
                  : null
            }
            hasSecret={connection.hasSecret}
            terminalId={connection.merchantId}
            clientId={connection.clientId}
          />
          <PaymentModeForm
            methodId={method.id}
            mode={method.mode}
            canUseBank={connection.hasSecret && Boolean(connection.merchantId && connection.clientId)}
          />
        </>
      )}
    </>
  );
}
