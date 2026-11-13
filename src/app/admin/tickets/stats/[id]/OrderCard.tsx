import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, formatMoment, formatMoney, type OrderRow } from "@/lib/ticketing/admin";
import { BOOKING_STATUS_BADGE, toBookingStatus } from "@/lib/bookingStatus";
import { buyerContact } from "@/lib/buyer";
import OrderActions from "./OrderActions";
import { orderAnchor } from "./SeatBlockMap";

/**
 * One order of the event, as the cashier needs it: its state, the buyer, what the bank knows, the
 * refund or cancel actions while the event is current, and seat by seat who has come in.
 */
export default function OrderCard({ order, online }: { order: OrderRow; online?: { paid: boolean; needsRefund: boolean } }) {
  const active = order.items.filter((item) => item.active);
  return (
    <div id={orderAnchor(order.orderNumber)} className="scroll-mt-24 bg-white rounded-3xl border border-cream-dark shadow-sm p-4 sm:p-5 target:ring-2 target:ring-gold">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-ocean">{order.orderNumber}</h3>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BOOKING_STATUS_BADGE[toBookingStatus(order.status)]}`}>
          {order.status === "confirmed" && order.amount === 0 ? "Подтверждён (бесплатно)" : ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      <p className="text-sm text-ocean/70 mt-1 break-all">{buyerContact(order)}</p>

      {/* What the cashier knows before acting: until when the seats are held, the bank's number,
          partial refunds and any note already written down. */}
      {(order.payment?.bankNumber || order.resolutionNote || order.refundedAmount > 0 || (order.expiresAt && ["pending", "payment_reported"].includes(order.status))) && (
        <ul className="mt-2 text-xs text-ocean/70 space-y-0.5">
          {order.expiresAt && ["pending", "payment_reported"].includes(order.status) && <li>Места держатся до {formatMoment(order.expiresAt)}</li>}
          {order.payment?.bankNumber && (
            <li>
              Номер в банке: <span className="break-all">{order.payment.bankNumber}</span>
            </li>
          )}
          {order.refundedAmount > 0 && order.status === "confirmed" && (
            <li className="font-semibold text-red-700">Возвращено за часть мест: {formatMoney(order.refundedAmount, order.currency)}</li>
          )}
          {order.resolutionNote && <li>Комментарий: {order.resolutionNote}</li>}
        </ul>
      )}

      {/* What can still happen to the order: a paid one goes back through the bank, whole or seat by
          seat, a free one is cancelled. A past or archived event's orders are history. */}
      {(order.amount > 0 ? ["pending", "payment_reported", "confirmed"] : ["confirmed"]).includes(order.status) && (
        <div className="mt-3 bg-cream/40 border border-cream-dark rounded-2xl px-3 py-3">
          {order.eventLocked ? (
            <p className="text-xs text-ocean/50">Мероприятие прошло или в архиве — действия с оплатой недоступны.</p>
          ) : (
            <OrderActions
              paidOnline={online?.paid === true}
              needsRefund={online?.needsRefund === true}
              free={order.amount === 0}
              seats={active.map((item) => ({ id: item.id, name: item.name, price: item.price, checkedIn: Boolean(item.checkedInAt) }))}
              order={{
                id: order.id,
                status: toBookingStatus(order.status),
                orderNumber: order.orderNumber,
                eventTitle: order.eventTitle,
                tickets: order.tickets,
                amountText: formatMoney(order.amount, order.currency),
                buyer: buyerContact(order),
              }}
            />
          )}
        </div>
      )}

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3">
        <div>
          <dt className="text-ocean/40">Сумма</dt>
          <dd className="text-ocean/80 font-medium">{order.amount > 0 ? formatMoney(order.amount, order.currency) : "бесплатно"}</dd>
        </div>
        <div>
          <dt className="text-ocean/40">Оплата</dt>
          <dd className="text-ocean/80 font-medium">
            {order.payment
              ? `${order.payment.provider} · ${PAYMENT_STATUS_LABEL[order.payment.status] ?? order.payment.status}`
              : order.amount > 0
                ? "ещё не начата"
                : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-ocean/40">Билетов / вошло</dt>
          <dd className="text-ocean/80 font-medium">
            {order.tickets} / {order.checkedIn}
          </dd>
        </div>
        <div>
          <dt className="text-ocean/40">{order.payment?.paidAt ? "Оплачен" : "Создан"}</dt>
          <dd className="text-ocean/80 font-medium">{formatMoment(order.payment?.paidAt ?? order.createdAt)}</dd>
        </div>
      </dl>

      {/* Seat by seat: which tickets were used at the door, which went back. */}
      {order.status === "confirmed" && order.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {order.items
            .filter((item) => item.active || item.refundedAt)
            .map((item) => (
              <span
                key={item.id}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  item.refundedAt ? "bg-red-50 text-red-700 line-through" : item.checkedInAt ? "bg-gold/15 text-ocean-dark" : "bg-ocean/5 text-ocean/50"
                }`}
              >
                {item.name}
                {item.refundedAt ? " · возврат" : item.checkedInAt ? ` · вход ${formatMoment(item.checkedInAt)}` : ""}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
