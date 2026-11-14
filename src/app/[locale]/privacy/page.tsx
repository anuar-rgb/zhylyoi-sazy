import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import LegalDocument from "@/components/LegalDocument";
import { LEGAL_DOCS } from "@/lib/legalDocs";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  return { title: LEGAL_DOCS.privacy.title[locale] };
}

export default async function Page() {
  const locale = (await getLocale()) as Locale;
  return <LegalDocument id="privacy" locale={locale} />;
}
