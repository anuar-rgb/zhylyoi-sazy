import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackProvider from "@/components/feedback/FeedbackProvider";
import ScrollTopButton from "@/components/ScrollTopButton";
import ScrollTopOnReload from "@/components/ScrollTopOnReload";
import SiteNotFound from "@/components/SiteNotFound";
import { getSiteDomain, getSiteOrganization } from "@/lib/organization";
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
      "«Кең Жылыой» Жылыой аудандық мәдениет үйінің ресми сайты. Құлсары қаласы, Жылыой ауданы, Атырау облысы.",
    ogLocale: "kk_KZ",
  },
  ru: {
    title: "Дом культуры «Кен Жылыой» Жылыойского района",
    description:
      "Официальный сайт районного дома культуры «Кен Жылыой». Город Кульсары, Жылыойский район, Атырауская область.",
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

  // The site's own address, so the link preview image is given to messengers as a full URL: the
  // institution's domain, which this request came in on.
  const domain = await getSiteDomain();
  // A domain no active institution has: nothing to describe, and nothing for search engines.
  if (!(await getSiteOrganization())) {
    return { title: locale === "kk" ? "Сайт табылмады" : "Сайт не найден", robots: { index: false, follow: false } };
  }

  return {
    metadataBase: new URL(`https://${domain ?? "dk-zhylyoi.kz"}`),
    title: { default: m.title, template: `%s | Кең Жылыой` },
    description: m.description,
    keywords: [
      "Кең Жылыой",
      "мәдениет үйі",
      "Дом культуры",
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

  // A domain that no active institution has: the server answers for it (a site switched off, an
  // address pointed here by mistake), but there is nothing of anyone's to show.
  const organization = await getSiteOrganization();
  if (!organization) {
    return (
      <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <SiteNotFound locale={locale} />
        </body>
      </html>
    );
  }

  return (
    <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <ScrollTopOnReload />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <FeedbackProvider>
          <Header />
          {/* overflow-x-hidden lives here, not on html/body: that combination breaks
              position: sticky on Header (see globals.css). */}
          <div className="flex-1 flex flex-col overflow-x-hidden">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ScrollTopButton label={locale === "kk" ? "Жоғары" : "Наверх"} />
          </FeedbackProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
