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
import { getSiteDomain, getSiteOrganization, localizedOrganization, siteBrand } from "@/lib/organization";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const OG_LOCALE = { kk: "kk_KZ", ru: "ru_RU" } as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "kk";

  // A domain no active institution has: nothing to describe, and nothing for search engines.
  const organization = await getSiteOrganization();
  if (!organization) {
    return { title: locale === "kk" ? "Сайт табылмады" : "Сайт не найден", robots: { index: false, follow: false } };
  }

  // Everything below is the institution's own, from its card (Настройки).
  const brand = siteBrand(organization, locale);
  const address = localizedOrganization(organization, locale, "address");
  const description =
    locale === "kk"
      ? `${brand.fullName} ресми сайты.${address ? ` ${address}.` : ""}`
      : `Официальный сайт: ${brand.fullName}.${address ? ` ${address}.` : ""}`;
  const shareImage = organization.shareImageUrl ?? organization.logoUrl;
  // The site's own address, so the preview picture is given to messengers as a full URL: the
  // institution's domain, which this request came in on.
  const domain = await getSiteDomain();

  return {
    metadataBase: new URL(`https://${domain ?? organization.domain ?? "dk-zhylyoi.kz"}`),
    title: { default: brand.fullName, template: `%s | ${brand.name}` },
    description,
    keywords: [brand.name, brand.fullName, locale === "kk" ? "мәдениет үйі" : "Дом культуры"],
    authors: [{ name: brand.fullName }],
    icons: organization.logoUrl ? { icon: organization.logoUrl, apple: organization.logoUrl } : undefined,
    openGraph: {
      title: brand.fullName,
      description,
      locale: OG_LOCALE[locale],
      type: "website",
      siteName: brand.name,
      ...(shareImage ? { images: [shareImage] } : {}),
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
          <Header brand={siteBrand(organization, locale)} showHonored={organization.sections.includes("honored")} />
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
