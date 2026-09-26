import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPaymentMethods } from "@/lib/paymentMethods";
import PaymentMethodControls from "./PaymentMethodControls";
import BackToTickets from "../BackToTickets";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

export default async function PaymentsPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToTickets />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Способы оплаты</h1>
        <div className={`${CARD} p-8`}>
          <p className="font-semibold text-ocean mb-2">Профиль сотрудника не настроен</p>
          <p className="text-sm text-ocean/60">
            Учётная запись существует, но не связана с профилем в системе. Обратитесь к администратору платформы.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = identity.organizationId ?? (await getSiteOrganizationId());
  const methods = organizationId ? await listPaymentMethods(organizationId) : [];

  return (
    <div>
      <BackToTickets />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ocean">
          Способы оплаты <span className="text-ocean/40 font-normal">({methods.length})</span>
        </h1>
        <Link href="/admin/tickets/payments/new" className="btn-primary px-5 py-2.5 text-sm font-semibold">
          Добавить способ оплаты
        </Link>
      </div>

      <p className="text-sm text-ocean/60 mb-6">
        Статический QR — зритель платит сам и ждёт, пока сотрудник подтвердит оплату вручную. Интеграция с банком по
        API появится отдельно.
      </p>

      {methods.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Способов оплаты пока нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => {
            const name = method.displayNameRu ?? method.displayNameKk ?? method.providerName;

            return (
              <div key={method.id} className={`${CARD} p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-ocean truncate">{name}</h2>
                    {method.isDefault && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/15 text-ocean-dark shrink-0">
                        По умолчанию
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ocean/50">{method.providerName}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/tickets/payments/${method.id}`}
                    className="text-xs font-semibold text-ocean border border-cream-dark rounded-full px-3 py-1.5 hover:bg-cream hover:text-gold-dark transition-colors"
                  >
                    Изменить
                  </Link>
                  <PaymentMethodControls
                    id={method.id}
                    providerName={method.providerName}
                    isEnabled={method.isEnabled}
                    isDefault={method.isDefault}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
