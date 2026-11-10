import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/profile";
import { getPaymentMethodById } from "@/lib/paymentMethods";
import { getBankConnection } from "@/lib/payments/keys";
import { hasIntegration, hasProvider } from "@/lib/payments/registry";
import BankConnectionForm from "../BankConnectionForm";
import PaymentModeForm from "../PaymentModeForm";

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const identity = await getStaffIdentity();
  if (!identity?.hasProfile) redirect("/admin/tickets/payments");

  // RLS decides visibility, so a method belonging to another institution simply is
  // not found rather than being refused — the two are indistinguishable here.
  const method = await getPaymentMethodById(id);
  if (!method) notFound();

  // For a bank the site has an integration for, and only for the institution the keys belong to.
  // The bank's details can be saved before the platform switches the bank on for buyers.
  const ownsMethod = !identity.organizationId || identity.organizationId === method.organizationId;
  const connection = ownsMethod && hasIntegration(method.providerCode) ? await getBankConnection(method.id) : null;
  const switchedOn = hasProvider(method.providerCode);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">{method.providerName}</h1>
        <Link href="/admin/tickets/payments" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
          ← Платёжные системы
        </Link>
      </div>
      {!hasIntegration(method.providerCode) && (
        <p className="mt-5 bg-cream/40 border border-cream-dark text-sm text-ocean/70 rounded-2xl px-4 py-3">
          У этого способа нет подключения к банку, поэтому покупатели им не пользуются: оплата принимается только картой на странице
          банка. Его можно выключить.
        </p>
      )}
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
            canUseBank={switchedOn && connection.hasSecret && Boolean(connection.merchantId && connection.clientId)}
            switchedOn={switchedOn}
          />
        </>
      )}
    </>
  );
}
