import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FadeIn from "@/components/FadeIn";
import { getBookingByToken } from "@/lib/bookings";
import { listPublicPaymentMethods } from "@/lib/paymentMethods";
import Countdown from "./Countdown";
import TicketQr from "./TicketQr";
import type { Locale } from "@/i18n/routing";

const STATUS_LABEL: Record<string, Record<Locale, string>> = {
  pending: { kk: "Кутілуде", ru: "Ожидает подтверждения" },
  confirmed: { kk: "Расталды", ru: "Подтверждена" },
  cancelled: { kk: "Болдырылмады", ru: "Отменена" },
  expired: { kk: "Мерзімі өтті", ru: "Истекла" },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700",
  confirmed: "bg-gold/15 text-ocean-dark",
  cancelled: "bg-ocean/5 text-ocean/50",
  expired: "bg-ocean/5 text-ocean/40",
};

export default async function MyTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;

  const booking = await getBookingByToken(token);
  if (!booking) notFound();

  const isConfirmed = booking.status === "confirmed";
  const needsPayment = booking.status === "pending" && booking.totalAmount > 0;
  const paymentMethods = needsPayment ? await listPublicPaymentMethods(booking.organizationId) : [];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h1 className="text-xl sm:text-2xl font-bold text-ocean">
                {locale === "kk" ? "Менің брониум" : "Моя бронь"}
              </h1>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending}`}
              >
                {STATUS_LABEL[booking.status]?.[locale] ?? booking.status}
              </span>
            </div>

            {booking.status === "pending" && booking.expiresAt && <Countdown expiresAt={booking.expiresAt} />}

            <p className="text-sm text-ocean/60 mt-2">
              {locale === "kk" ? "Аты-жөні" : "Имя"}: <span className="text-ocean font-medium">{booking.buyerName}</span>
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
                      {isConfirmed && <TicketQr value={item.ticketCode} />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ocean">
                          {locale === "kk" ? "Қатар" : "Ряд"} {item.rowLabel}, {locale === "kk" ? "орын" : "место"}{" "}
                          {item.seatNumber}
                        </p>
                        <p className="text-xs text-ocean/50">{name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-ocean shrink-0">
                      {item.priceAtBooking > 0 ? `${item.priceAtBooking} ₸` : locale === "kk" ? "тегін" : "бесплатно"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-cream-dark">
              <span className="font-bold text-ocean">{locale === "kk" ? "Барлығы" : "Итого"}</span>
              <span className="text-lg font-bold text-ocean">
                {booking.totalAmount > 0 ? `${booking.totalAmount} ₸` : locale === "kk" ? "тегін" : "бесплатно"}
              </span>
            </div>

            {booking.status === "pending" && !needsPayment && (
              <p className="text-xs text-ocean/40 mt-4">
                {locale === "kk"
                  ? "Бұл броньдау үшін төлем келесі кезеңде қосылады."
                  : "Оплата для этой брони появится позже — сейчас место просто удерживается."}
              </p>
            )}
          </div>
        </FadeIn>

        {needsPayment && (
          <FadeIn>
            <div className="mt-6 bg-white rounded-3xl border border-cream-dark shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ocean mb-1">{locale === "kk" ? "Төлем" : "Оплата"}</h2>
              <p className="text-sm text-ocean/60 mb-5">
                {locale === "kk"
                  ? `Төлеңіз (${booking.totalAmount} ₸) және әкімшінің растауын күтіңіз. Бет автоматты жаңармайды —
                     кейінірек осы сілтеме арқылы кіріп тексеріңіз.`
                  : `Оплатите (${booking.totalAmount} ₸) и дождитесь подтверждения администратором. Страница не
                     обновляется автоматически — зайдите по этой же ссылке позже, чтобы проверить статус.`}
              </p>

              {paymentMethods.length === 0 ? (
                <p className="text-sm text-ocean/50 bg-cream/30 rounded-2xl p-4">
                  {locale === "kk"
                    ? "Ұйым төлем тәсілін әлі қоспаған. Байланысу үшін ұйыммен хабарласыңыз."
                    : "Организация ещё не подключила способ оплаты. Свяжитесь с организацией напрямую."}
                </p>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => {
                    const name = method.displayNameRu ?? method.displayNameKk ?? method.providerName;
                    return (
                      <div
                        key={method.id}
                        className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-cream/30 rounded-2xl p-4"
                      >
                        {method.staticQrImageUrl && (
                          <div className="relative w-36 h-36 shrink-0 rounded-2xl overflow-hidden border border-cream-dark bg-white">
                            <Image src={method.staticQrImageUrl} alt={name} fill className="object-contain" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-ocean">
                            {name}
                            {method.isDefault && (
                              <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/15 text-ocean-dark">
                                {locale === "kk" ? "Ұсынылады" : "Рекомендуется"}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        <FadeIn>
          <div className="mt-6 text-center">
            <Link href="/afisha" className="text-sm font-semibold text-ocean/60 hover:text-ocean">
              ← {locale === "kk" ? "Афишаға оралу" : "Все мероприятия"}
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
