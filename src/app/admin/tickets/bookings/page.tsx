import { getStaffIdentity } from "@/lib/profile";
import { getSiteOrganizationId } from "@/lib/organization";
import { listConfirmedBookings, listPendingPaidBookings } from "@/lib/bookingsAdmin";
import ConfirmPaymentButton from "./ConfirmPaymentButton";
import BackToTickets from "../BackToTickets";

const CARD = "bg-white rounded-3xl border border-cream-dark shadow-sm";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

export default async function PendingBookingsPage() {
  const identity = await getStaffIdentity();

  if (!identity?.hasProfile) {
    return (
      <div>
        <BackToTickets />
        <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">Ожидают оплаты</h1>
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
  const [bookings, confirmedBookings] = organizationId
    ? await Promise.all([listPendingPaidBookings(organizationId), listConfirmedBookings(organizationId)])
    : [[], []];

  return (
    <div>
      <BackToTickets />
      <h1 className="text-xl sm:text-2xl font-bold text-ocean mb-6">
        Ожидают оплаты <span className="text-ocean/40 font-normal">({bookings.length})</span>
      </h1>

      <p className="text-sm text-ocean/60 mb-6">
        Платные брони, где место уже удерживается, но оплата ещё не подтверждена. Проверьте оплату (Kaspi/Halyk) и
        подтвердите вручную — бесплатные брони сюда не попадают, они подтверждаются сами при создании.
      </p>

      {bookings.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Ожидающих оплаты броней нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className={`${CARD} p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap`}>
              <div className="min-w-0">
                <h2 className="font-bold text-ocean truncate">{booking.buyerName}</h2>
                <p className="text-sm text-ocean/50">
                  {booking.buyerPhone} · {booking.eventTitle || "Мероприятие не найдено"}
                </p>
                <p className="text-xs text-ocean/40 mt-0.5">
                  Создана {formatDateTime(booking.createdAt)}
                  {booking.expiresAt && <> · держится до {formatDateTime(booking.expiresAt)}</>}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-lg font-bold text-ocean">{booking.totalAmount} ₸</span>
                <ConfirmPaymentButton id={booking.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-ocean mt-10 mb-6">
        Подтверждённые <span className="text-ocean/40 font-normal">({confirmedBookings.length})</span>
      </h2>

      <p className="text-sm text-ocean/60 mb-6">
        Для ручной проверки без сканера — если места отмечены, значит зритель уже прошёл через
        <span className="whitespace-nowrap"> /admin/tickets/scan</span>.
      </p>

      {confirmedBookings.length === 0 ? (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-ocean/60">Подтверждённых броней нет.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {confirmedBookings.map((booking) => (
            <div key={booking.id} className={`${CARD} p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-ocean truncate">{booking.buyerName}</h3>
                  <p className="text-sm text-ocean/50">
                    {booking.buyerPhone} · {booking.eventTitle || "Мероприятие не найдено"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-ocean shrink-0">
                  {booking.totalAmount > 0 ? `${booking.totalAmount} ₸` : "бесплатно"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.items.map((item) => (
                  <span
                    key={item.id}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                      item.checkedInAt ? "bg-gold/15 text-ocean-dark" : "bg-ocean/5 text-ocean/50"
                    }`}
                    title={item.checkedInAt ? `Вход: ${formatDateTime(item.checkedInAt)}` : "Ещё не проходил"}
                  >
                    Ряд {item.rowLabel}, место {item.seatNumber}
                    {item.checkedInAt ? ` · вход ${formatDateTime(item.checkedInAt)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
