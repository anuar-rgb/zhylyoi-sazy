import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuickContactButton from "@/components/QuickContactButton";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const meta = {
  kk: {
    title: "«Кең Жылыой» Жылыой аудандық мәдениет үйі",
    description:
      "«Кең Жылыой» Жылыой аудандық мәдениет үйінің ресми сайты. «Жылыой сазы» фольклорлық ансамблі және мәдени іс-шаралар. Құлсары қаласы, Жылыой ауданы, Атырау облысы.",
    ogLocale: "kk_KZ",
  },
  ru: {
    title: "Дом культуры «Кен Жылыой» Жылыойского района",
    description:
      "Официальный сайт районного дома культуры «Кен Жылыой». Фольклорный ансамбль «Жылыой сазы» и культурные мероприятия. Город Кульсары, Жылыойский район, Атырауская область.",
    ogLocale: "ru_RU",
  },
} as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = hasLocale(routing.locales, locale) ? meta[locale] : meta.kk;

  return {
    title: { default: m.title, template: `%s | Кең Жылыой` },
    description: m.description,
    keywords: [
      "Кең Жылыой",
      "мәдениет үйі",
      "Дом культуры",
      "Жылыой сазы",
      "фольклорлық ансамбль",
      "домбыра",
      "қобыз",
      "Құлсары",
      "Жылыой ауданы",
      "Атырау облысы",
    ],
    authors: [{ name: m.title }],
    openGraph: {
      title: m.title,
      description: m.description,
      locale: m.ogLocale,
      type: "website",
      siteName: "Кең Жылыой",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <QuickContactButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
