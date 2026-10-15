import { seatName } from "@/lib/hallSections";
import { categoryLabel } from "@/lib/seatCategories";
import { formatDateTime } from "@/lib/timeZone";
import { formatMoney } from "@/lib/ticketing/admin";
import type { SoldTicket } from "@/lib/ticketing/occupancy";

/** The sold tickets under the hall map: a table on a wide screen, one card per ticket on a phone. */
export default function SoldTickets({ tickets }: { tickets: SoldTicket[] }) {
  if (tickets.length === 0) {
    return <p className="text-sm text-ocean/60 px-5 sm:px-6 py-5">Проданных билетов нет.</p>;
  }

  const entered = (t: SoldTicket) =>
    t.enteredAt ? <span className="text-gray-600">вошёл {formatDateTime(t.enteredAt)}</span> : <span className="text-ocean/40">нет</span>;

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ocean/50 border-b border-cream-dark">
              <th className="font-medium px-6 py-2.5">Место</th>
              <th className="font-medium px-3 py-2.5">Категория</th>
              <th className="font-medium px-3 py-2.5 text-right">Цена</th>
              <th className="font-medium px-3 py-2.5">Заказ</th>
              <th className="font-medium px-3 py-2.5">Покупатель</th>
              <th className="font-medium px-3 py-2.5">Телефон</th>
              <th className="font-medium px-6 py-2.5">Вход</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark">
            {tickets.map((t, i) => (
              <tr key={i} className="text-ocean">
                <td className="px-6 py-2.5 whitespace-nowrap">{seatName(t)}</td>
                <td className="px-3 py-2.5">{t.category ? categoryLabel(t.category) : "—"}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{t.paid > 0 ? formatMoney(t.paid) : "бесплатно"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{t.orderNumber}</td>
                <td className="px-3 py-2.5">{t.buyerName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{t.buyerPhone}</td>
                <td className="px-6 py-2.5 whitespace-nowrap">{entered(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-cream-dark">
        {tickets.map((t, i) => (
          <li key={i} className="px-5 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-ocean">{seatName(t)}</span>
              <span className="text-ocean shrink-0">{t.paid > 0 ? formatMoney(t.paid) : "бесплатно"}</span>
            </div>
            <p className="text-ocean/60">
              {t.category ? categoryLabel(t.category) : "—"} · {t.orderNumber}
            </p>
            <p className="text-ocean/80">
              {t.buyerName} · {t.buyerPhone}
            </p>
            <p className="text-xs mt-0.5">Вход: {entered(t)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
