import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { getBookingByToken } from "@/lib/bookings";
import { getCultureEventById } from "@/lib/cultureEvents";
import { BOOKING_STATUS_BADGE, BOOKING_STATUS_PUBLIC, isHold } from "@/lib/bookingStatus";
import { seatName } from "@/lib/hallSections";
import { listPublicPaymentMethodsForEvent } from "@/lib/paymentMethods";
import { formatTime } from "@/lib/timeZone";
import Countdown from "./Countdown";
import TicketQr from "./TicketQr";
import PayButton from "./PayButton";
import ManualPayment from "./ManualPayment";
import ReportPaidButton from "./ReportPaidButton";
import TicketActions from "./TicketActions";
import type { Locale } from "@/i18n/routing";

/** What the buyer is told under the order once it is no longer waiting for money. */
const AFTER: Partial<Record<string, { ru: string; kk: string }>> = {
  expired: {
    ru: "15 минут прошли без подтверждения оплаты, места освобождены. Если вы уже перевели деньги, свяжитесь с учреждением и назовите номер заказа.",
    kk: "15 минут ішінде төлем расталмады, орындар босатылды. Ақша аударып қойсаңыз, мекемеге хабарласып, тапсырыс нөмірін айтыңыз.",
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
  const reported = booking.status === "payment_reported";
  const [paymentMethods, event] = await Promise.all([
    needsPayment ? listPublicPaymentMethodsForEvent(booking.eventId, booking.organizationId) : Promise.resolve([]),
    getCultureEventById(booking.eventId),
  ]);

  // Every method goes through the bank: the order confirms itself when the bank reports the payment.
  const bankOnly = paymentMethods.length > 0 && paymentMethods.every((method) => method.mode === "api");
  // A manual method is usable only with the institution's own link or QR; without one there is
  // nothing to pay by yet, and the buyer is told not to pay.
  const manualMethods = paymentMethods.filter((method) => method.mode !== "api" && (method.paymentUrl || method.staticQrImageUrl));
  const canPay = bankOnly || manualMethods.length > 0;
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
                return (
                  <div
                    key={item.itemId}
                    className="flex flex-wrap items-center justify-between gap-3 bg-cream/30 rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isConfirmed && item.ticketCode && <TicketQr value={item.ticketCode} />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ocean">{seatName(item, lang)}</p>
                        <p className="text-xs text-ocean/50">{name}</p>
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

            {after && <p className="text-sm text-ocean/70 mt-5 bg-cream/40 rounded-2xl px-4 py-3">{after}</p>}
          </div>
        </FadeIn>

        {needsPayment && (
          <FadeIn>
            <div className="mt-6 bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ocean mb-3">{lang === "kk" ? "Төлем" : "Оплата"}</h2>

              {reported && booking.paymentReportedAt && (
                <p className="text-sm text-ocean bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-5">
                  {lang === "kk"
                    ? `Сіз төлегеніңізді ${formatTime(booking.paymentReportedAt)} хабарладыңыз. Кассир Kaspi-дегі түсімді тексереді — билеттер осы бетте пайда болады. Бетті кейінірек жаңартыңыз.`
                    : `Вы сообщили об оплате в ${formatTime(booking.paymentReportedAt)}. Кассир проверит поступление в Kaspi — билеты появятся на этой странице. Обновите её чуть позже.`}
                </p>
              )}

              {!canPay ? (
                <p className="text-sm text-ocean bg-red-50 border border-red-200 rounded-2xl p-4">
                  {lang === "kk"
                    ? "Мекеме төлем сілтемесін әлі берген жоқ. Әзірге төлемеңіз — мекемеге хабарласыңыз."
                    : "Учреждение ещё не указало ссылку для оплаты. Пока не платите — свяжитесь с учреждением."}
                </p>
              ) : bankOnly ? (
                <>
                  <p className="text-sm text-ocean/60 mb-5">
                    {lang === "kk"
                      ? `Төлеу үшін «Төлеу» түймесін басыңыз (${sum}): банк бетіне өтесіз. Банк төлемді хабарлаған бойда тапсырыс өзі расталады.`
                      : `Нажмите «Оплатить» (${sum}): вы перейдёте на страницу банка. Заказ подтвердится сам, как только банк сообщит об оплате.`}
                  </p>
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="bg-cream/30 rounded-2xl p-4 text-center sm:text-left">
                        <p className="text-sm font-semibold text-ocean mb-3">
                          {method.displayNameRu ?? method.displayNameKk ?? method.providerName}
                        </p>
                        <PayButton accessToken={token} methodId={method.id} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <ol className="text-sm text-ocean/70 space-y-1.5 mb-5 list-decimal pl-5">
                    {lang === "kk" ? (
                      <>
                        <li>
                          Дәл <b className="text-ocean">{sum}</b> соманы төмендегі сілтеме немесе QR арқылы төлеңіз.
                        </li>
                        <li>Бронь уақыты біткенше «Мен төледім» түймесін басыңыз.</li>
                        <li>Кассир түсімді тексереді — билеттер осы бетте пайда болады.</li>
                      </>
                    ) : (
                      <>
                        <li>
                          Оплатите ровно <b className="text-ocean">{sum}</b> по ссылке или QR ниже.
                        </li>
                        <li>До конца брони нажмите «Я оплатил».</li>
                        <li>Кассир проверит поступление — билеты появятся на этой странице.</li>
                      </>
                    )}
                  </ol>
                  <div className="space-y-4">
                    {manualMethods.map((method) => (
                      <ManualPayment
                        key={method.id}
                        name={method.displayNameRu ?? method.displayNameKk ?? method.providerName}
                        isDefault={method.isDefault}
                        qrUrl={method.staticQrImageUrl}
                        paymentUrl={method.paymentUrl}
                        locale={lang}
                      />
                    ))}
                  </div>
                  {!reported && <ReportPaidButton token={token} />}
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
