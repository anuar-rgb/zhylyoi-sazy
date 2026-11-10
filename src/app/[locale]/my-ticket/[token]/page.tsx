import { notFound } from "next/navigation";
import { hasProvider } from "@/lib/payments/registry";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { getBookingByToken } from "@/lib/bookings";
import { getCultureEventById } from "@/lib/cultureEvents";
import { BOOKING_STATUS_BADGE, BOOKING_STATUS_PUBLIC, isHold } from "@/lib/bookingStatus";
import { seatName } from "@/lib/hallSections";
import { listPublicPaymentMethodsForEvent } from "@/lib/paymentMethods";
import { getOrderSnapshot } from "@/lib/payments/orderStatus";
import { formatTime } from "@/lib/timeZone";
import Countdown from "./Countdown";
import TicketQr from "./TicketQr";
import PayButton from "./PayButton";
import CancelOrderButton from "./CancelOrderButton";
import TicketActions from "./TicketActions";
import type { Locale } from "@/i18n/routing";

/** What the buyer is told under the order once it is no longer waiting for money. */
const AFTER: Partial<Record<string, { ru: string; kk: string }>> = {
  expired: {
    ru: "15 минут прошли, оплата не поступила, места освобождены. Если деньги всё же списались, банк вернёт их сам, а если нет — свяжитесь с учреждением и назовите номер заказа.",
    kk: "15 минут өтті, төлем түспеді, орындар босатылды. Ақша бәрібір шегерілсе, банк оны өзі қайтарады, болмаса мекемеге хабарласып, тапсырыс нөмірін айтыңыз.",
  },
  rejected: {
    ru: "Кассир не нашёл оплату по этому заказу, места освобождены. Если вы оплатили, свяжитесь с учреждением и назовите номер заказа.",
    kk: "Кассир бұл тапсырыс бойынша төлемді таппады, орындар босатылды. Төлеген болсаңыз, мекемеге хабарласып, тапсырыс нөмірін айтыңыз.",
  },
  late_payment: {
    ru: "Деньги пришли после окончания брони. Кассир решит: выдать билеты, если места ещё свободны, или вернуть деньги.",
    kk: "Ақша бронь уақыты біткен соң келді. Кассир шешеді: орындар бос болса — билет береді, болмаса — ақшаны қайтарады.",
  },
  refunded: { ru: "Деньги за этот заказ возвращены, билеты больше не действуют.", kk: "Бұл тапсырыстың ақшасы қайтарылды, билеттер енді жарамсыз." },
  cancelled: { ru: "Заказ отменён, места освобождены.", kk: "Тапсырыстан бас тартылды, орындар босатылды." },
};

export default async function MyTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;
  const lang = locale === "kk" ? "kk" : "ru";

  const booking = await getBookingByToken(token);
  if (!booking) notFound();

  const isConfirmed = booking.status === "confirmed";
  const holding = isHold(booking.status);
  const needsPayment = holding && booking.totalAmount > 0;
  const [paymentMethods, event] = await Promise.all([
    needsPayment ? listPublicPaymentMethodsForEvent(booking.eventId, booking.organizationId) : Promise.resolve([]),
    getCultureEventById(booking.eventId),
  ]);

  // Payment is by card on the bank's page only: the order confirms itself when the bank reports it.
  const bankMethods = paymentMethods.filter((method) => method.mode === "api" && hasProvider(method.providerCode));
  const canPay = bankMethods.length > 0;
  // A card attempt already failed: the seats are still the buyer's, so offer it again and say so.
  const attemptFailed = canPay && ["failed", "cancelled"].includes((await getOrderSnapshot(token))?.payment ?? "");
  // Seats returned by a partial refund: their tickets no longer work.
  const returned = isConfirmed ? booking.items.filter((item) => item.releasedAt) : [];
  const returnedSum = returned.reduce((sum, item) => sum + item.priceAtBooking, 0);
  const eventTitle = event ? (lang === "kk" ? (event.titleKk ?? event.titleRu) : (event.titleRu ?? event.titleKk)) : null;
  const sum = `${booking.totalAmount} ₸`;
  const after = AFTER[booking.status]?.[lang];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-ocean">
                  {booking.orderNumber
                    ? `${lang === "kk" ? "Тапсырыс" : "Заказ"} ${booking.orderNumber}`
                    : lang === "kk"
                      ? "Менің брониум"
                      : "Моя бронь"}
                </h1>
                {eventTitle && <p className="text-sm text-ocean/70 mt-0.5">{eventTitle}</p>}
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${BOOKING_STATUS_BADGE[booking.status]}`}>
                {BOOKING_STATUS_PUBLIC[booking.status][lang]}
              </span>
            </div>

            {holding && booking.expiresAt && (
              <>
                <Countdown expiresAt={booking.expiresAt} />
                <p className="text-xs text-ocean/50">
                  {lang === "kk" ? `Бронь ${formatTime(booking.expiresAt)} дейін` : `Бронь до ${formatTime(booking.expiresAt)}`}
                </p>
              </>
            )}

            <p className="text-sm text-ocean/60 mt-2">
              {lang === "kk" ? "Аты-жөні" : "Имя"}: <span className="text-ocean font-medium">{booking.buyerName}</span>
            </p>

            <div className="mt-5 pt-5 border-t border-cream-dark space-y-2.5">
              {booking.items.map((item) => {
                const name = item.ticketTypeNameRu ?? item.ticketTypeNameKk ?? item.category;
                const isReturned = isConfirmed && Boolean(item.releasedAt);
                return (
                  <div
                    key={item.itemId}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${isReturned ? "bg-red-50/60" : "bg-cream/30"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isConfirmed && !isReturned && item.ticketCode && <TicketQr value={item.ticketCode} />}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isReturned ? "text-ocean/50 line-through" : "text-ocean"}`}>{seatName(item, lang)}</p>
                        <p className="text-xs text-ocean/50">
                          {isReturned ? (lang === "kk" ? "Ақшасы қайтарылды, билет жарамсыз" : "Деньги возвращены, билет не действует") : name}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-ocean shrink-0">
                      {item.priceAtBooking > 0 ? `${item.priceAtBooking} ₸` : lang === "kk" ? "тегін" : "бесплатно"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-cream-dark">
              <span className="font-bold text-ocean">
                {lang === "kk" ? "Барлығы" : "Итого"}
                <span className="font-normal text-ocean/50">
                  {" · "}
                  {lang === "kk" ? `${booking.items.length} билет` : `билетов: ${booking.items.length}`}
                </span>
              </span>
              <span className="text-lg font-bold text-ocean">
                {booking.totalAmount > 0 ? sum : lang === "kk" ? "тегін" : "бесплатно"}
              </span>
            </div>

            {returned.length > 0 && (
              <p className="text-sm text-ocean/70 mt-5 bg-cream/40 rounded-2xl px-4 py-3">
                {lang === "kk"
                  ? `${returned.length} билеттің ақшасы (${returnedSum} ₸) картаңызға қайтарылды. Қалған билеттер жарамды.`
                  : `Деньги за ${returned.length} ${returned.length === 1 ? "билет" : "билета"} (${returnedSum} ₸) возвращены на вашу карту. Остальные билеты действуют.`}
              </p>
            )}

            {after && <p className="text-sm text-ocean/70 mt-5 bg-cream/40 rounded-2xl px-4 py-3">{after}</p>}
          </div>
        </FadeIn>

        {needsPayment && (
          <FadeIn>
            <div className="mt-6 bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ocean mb-3">{lang === "kk" ? "Төлем" : "Оплата"}</h2>

              {!canPay ? (
                <p className="text-sm text-ocean bg-red-50 border border-red-200 rounded-2xl p-4">
                  {lang === "kk"
                    ? "Картамен онлайн төлем әзірге қосылмаған. Ешқайда төлемеңіз — мекемеге хабарласыңыз."
                    : "Оплата картой онлайн пока не подключена. Никуда не платите — свяжитесь с учреждением."}
                </p>
              ) : (
                <>
                  {attemptFailed && (
                    <p className="text-sm text-ocean bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                      {lang === "kk"
                        ? "Төлем өтпеді, ақша алынбады. Орындар әзірге сізде — қайталап көріңіз немесе басқа картаны қолданыңыз."
                        : "Оплата не прошла, деньги не списаны. Места пока за вами: попробуйте ещё раз или другой картой."}
                    </p>
                  )}
                  <p className="text-sm text-ocean/60 mb-5">
                    {lang === "kk"
                      ? `Банк бетінде карта деректерін енгізіңіз (${sum}). Төлем өткен бойда билеттер осында пайда болады.`
                      : `Введите данные карты на странице банка (${sum}). Как только оплата пройдёт, билеты появятся здесь.`}
                  </p>
                  <div className="space-y-4">
                    {bankMethods.map((method) => (
                      <div key={method.id} className="bg-cream/30 rounded-2xl p-4 text-center sm:text-left">
                        <PayButton accessToken={token} methodId={method.id} retry={attemptFailed} />
                      </div>
                    ))}
                  </div>
                  {booking.status === "pending" && (
                    <CancelOrderButton token={token} seatsHref={event?.slug ? `/afisha/${event.slug}/tickets` : null} />
                  )}
                </>
              )}
            </div>
          </FadeIn>
        )}

        <FadeIn>
          <TicketActions token={token} canDownload={isConfirmed} />
          <div className="mt-6 text-center">
            <Link href="/afisha" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
              ← {lang === "kk" ? "Афишаға оралу" : "Все мероприятия"}
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
