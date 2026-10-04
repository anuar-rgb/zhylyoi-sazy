import {
  NOTE_LABEL,
  PAYMENT_STATUS_LABEL,
  WEBHOOK_STATUS_LABEL,
  formatMoment,
  formatMoney,
  getTicketingScope,
  listPayments,
  listWebhookEvents,
} from "@/lib/ticketing/admin";
import BackToTickets from "../BackToTickets";
import NoProfile from "../NoProfile";
import RefundButton from "./RefundButton";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

const BADGE: Record<string, string> = {
  success: "bg-gold/15 text-ocean-dark",
  pending: "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-ocean/5 text-ocean/50",
  refund_pending: "bg-red-50 text-red-700",
  refunded: "bg-ocean/5 text-ocean/60",
};

const WEBHOOK_BADGE: Record<string, string> = {
  processed: "text-ocean-dark",
  ignored: "text-ocean/50",
  received: "text-blue-700",
  rejected: "text-red-700",
  error: "text-red-700",
};

export default async function TransactionsPage() {
  const scope = await getTicketingScope();
  if (!scope.ok) return <NoProfile title="Платежи и возвраты" reason={scope.reason} />;

  const [payments, events] = await Promise.all([
    listPayments(scope.organizationId),
    listWebhookEvents(scope.organizationId),
  ]);
  const needRefund = payments.filter((p) => p.needsRefund && p.status === "success");

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-2">Платежи и возвраты</h1>
      <p className="text-sm text-ocean/60 mb-6">
        Платежи через банк и сообщения, которые банк присылает сайту. Платежи, подтверждённые вручную по QR или ссылке,
        здесь не появляются: их видно в разделе «Заказы».
      </p>

      {needRefund.length > 0 && (
        <section className="mb-8" aria-labelledby="need-refund">
          <h2 id="need-refund" className="text-lg font-bold text-red-700 mb-1">
            Требуют возврата ({needRefund.length})
          </h2>
          <p className="text-sm text-ocean/60 mb-3">
            Деньги от банка пришли, но заказ не смог их принять. Верните деньги покупателю в кабинете банка и затем
            нажмите «Отметить возврат».
          </p>
          <div className="space-y-3">
            {needRefund.map((p) => (
              <div key={p.id} className={`${CARD} border-red-200 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-ocean">
                    {p.orderNumber} · {formatMoney(p.amount, p.currency)}
                  </h3>
                  <RefundButton paymentId={p.id} orderNumber={p.orderNumber} />
                </div>
                <p className="text-sm text-ocean/70 mt-1">
                  {p.buyerName} · {p.eventTitle}
                </p>
                {p.note && <p className="text-xs font-semibold text-red-700 mt-2">{NOTE_LABEL[p.note] ?? p.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10" aria-labelledby="payments">
        <h2 id="payments" className="text-lg font-bold text-ocean mb-3">
          Платежи <span className="text-ocean/40 font-normal">({payments.length})</span>
        </h2>
        {payments.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ocean/60">Платежей через банк пока не было.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className={`${CARD} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-ocean">
                    {p.orderNumber} · {formatMoney(p.amount, p.currency)}
                  </h3>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BADGE[p.status] ?? BADGE.cancelled}`}>
                    {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <p className="text-sm text-ocean/70 mt-1">
                  {p.buyerName} · {p.eventTitle || "—"}
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
                  <div>
                    <dt className="text-ocean/40">Банк</dt>
                    <dd className="text-ocean/80 font-medium">{p.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-ocean/40">Создан</dt>
                    <dd className="text-ocean/80 font-medium">{formatMoment(p.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ocean/40">Оплачен</dt>
                    <dd className="text-ocean/80 font-medium">{formatMoment(p.paidAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ocean/40">Возвращён</dt>
                    <dd className="text-ocean/80 font-medium">{formatMoment(p.refundedAt)}</dd>
                  </div>
                </dl>
                {(p.note || p.failureReason) && (
                  <p className="text-xs text-ocean/60 mt-3">{p.note ? NOTE_LABEL[p.note] ?? p.note : p.failureReason}</p>
                )}
                {p.status === "success" && !p.needsRefund && (
                  <div className="mt-3">
                    <RefundButton paymentId={p.id} orderNumber={p.orderNumber} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="journal">
        <h2 id="journal" className="text-lg font-bold text-ocean mb-1">
          Сообщения от банка
        </h2>
        <p className="text-sm text-ocean/60 mb-3">
          Последние 30. Здесь видно, что пришло, когда и чем кончилось, включая сообщения, которые сайт отклонил. Само
          содержимое не хранится, только отпечаток.
        </p>
        {events.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ocean/60">Сообщений пока не было.</p>
          </div>
        ) : (
          <ul className={`${CARD} divide-y divide-cream-dark`}>
            {events.map((e) => (
              <li key={e.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                <span className="text-ocean/80">
                  {e.provider} · {e.eventType ?? "без типа"}
                </span>
                <span className={`font-semibold ${WEBHOOK_BADGE[e.status] ?? "text-ocean/60"}`}>
                  {WEBHOOK_STATUS_LABEL[e.status] ?? e.status}
                  {e.error ? ` (${e.error})` : ""}
                </span>
                <span className="text-xs text-ocean/50 w-full sm:w-auto">{formatMoment(e.receivedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
