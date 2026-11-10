import Link from "next/link";
import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listPaymentMethods, type PaymentMethodRecord } from "@/lib/paymentMethods";
import { getBankConnection } from "@/lib/payments/keys";
import { hasIntegration, hasProvider } from "@/lib/payments/registry";
import PaymentMethodControls from "./PaymentMethodControls";
import ConnectButton from "./ConnectButton";
import BackToTickets from "../BackToTickets";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

/**
 * The payment systems an institution can connect, as cards. A system is offered only once the
 * site has its integration (registry.ts); the others are shown as «Скоро» so staff know what is
 * coming, and cannot be chosen.
 */
const CATALOG: { code: string; name: string; region: string }[] = [
  { code: "halyk_epay", name: "ePay Halyk Bank", region: "Казахстан" },
  { code: "freedom_pay", name: "Freedom Pay", region: "Казахстан" },
];

type Status = { label: string; className: string; hint: string };

const STATUS = {
  on: { label: "Подключено", className: "bg-green-50 text-green-800 border-green-200", hint: "Покупатели платят картой на странице банка." },
  setup: {
    label: "Не настроено",
    className: "bg-orange-50 text-orange-800 border-orange-200",
    hint: "Введите данные, которые выдал банк, и включите приём оплаты.",
  },
  off: { label: "Выключено", className: "bg-ocean/5 text-ocean/60 border-cream-dark", hint: "Покупатели этим способом не платят." },
} satisfies Record<string, Status>;

async function statusOf(method: PaymentMethodRecord): Promise<Status> {
  if (!method.isEnabled) return STATUS.off;
  const connection = await getBankConnection(method.id);
  const ready = connection.hasSecret && Boolean(connection.merchantId && connection.clientId);
  return ready && method.mode === "api" ? STATUS.on : STATUS.setup;
}

function CardIcon() {
  return (
    <svg className="w-5 h-5 text-ocean/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M3 10h18M7 15h3" />
    </svg>
  );
}

export default async function PaymentsPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToTickets />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Платёжные системы</h1>
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
  const byCode = new Map(methods.map((method) => [method.providerCode, method]));
  const cards = await Promise.all(
    CATALOG.map(async (entry) => {
      const method = byCode.get(entry.code) ?? null;
      return {
        ...entry,
        available: hasProvider(entry.code),
        // Written but not yet switched on for this site (Halyk until HALYK_EPAY_LIVE=1).
        pending: !hasProvider(entry.code) && hasIntegration(entry.code),
        method,
        status: method ? await statusOf(method) : null,
      };
    })
  );
  // Methods of systems the site does not connect to: payment is by card on a connected bank's page only.
  const unused = methods.filter((method) => !hasProvider(method.providerCode));

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Платёжные системы</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Покупатель платит картой на странице банка, билеты выдаются сами. Подключите банк, введите данные, которые он выдал, и
        включите приём оплаты.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.code} className={`${CARD} p-5 flex flex-col gap-4 ${card.available ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CardIcon />
                <div className="min-w-0">
                  <h2 className="font-bold text-ocean leading-snug">{card.name}</h2>
                  <p className="text-xs text-ocean/40 mt-0.5">{card.region}</p>
                </div>
              </div>
              {card.status ? (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${card.status.className}`}>
                  {card.status.label}
                </span>
              ) : !card.available ? (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-cream-dark text-ocean/50 shrink-0">Скоро</span>
              ) : null}
            </div>

            <p className="text-sm text-ocean/60 flex-1">
              {card.pending
                ? "Подключение готово и будет включено администратором платформы после проверки банком."
                : !card.available
                ? "Подключение к этой системе ещё не готово."
                : card.status
                  ? card.status.hint
                  : "Ещё не подключено."}
            </p>

            {card.available &&
              (card.method ? (
                <Link
                  href={`/admin/tickets/payments/${card.method.id}`}
                  className="self-start text-sm font-semibold text-ocean border border-cream-dark rounded-full px-5 py-2 hover:bg-cream hover:text-gold-dark transition-colors"
                >
                  Настроить
                </Link>
              ) : (
                <div className="self-start">
                  <ConnectButton providerCode={card.code} />
                </div>
              ))}
          </div>
        ))}
      </div>

      {unused.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ocean/70 mb-1">Прежние способы оплаты</h2>
          <p className="text-xs text-ocean/50 mb-3">
            Покупатели ими не пользуются: оплата принимается только картой на странице банка. Их можно удалить.
          </p>
          <div className="space-y-2">
            {unused.map((method) => (
              <div key={method.id} className={`${CARD} p-4 flex items-center justify-between gap-4 flex-wrap`}>
                <p className="font-semibold text-ocean text-sm">{method.displayNameRu ?? method.displayNameKk ?? method.providerName}</p>
                <PaymentMethodControls id={method.id} providerName={method.providerName} isEnabled={method.isEnabled} isDefault={method.isDefault} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
