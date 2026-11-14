import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getSiteOrganization, siteBrand } from "@/lib/organization";
import type { Locale } from "@/i18n/routing";

export type PageMeta = Record<Locale, { title: string; description: (institution: string) => string }>;

/**
 * A public page's title and description, the description naming the site's institution by its full
 * name from the card, so each institution's pages describe that institution.
 */
export async function institutionPageMetadata(meta: PageMeta): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const organization = await getSiteOrganization();
  const name = organization ? siteBrand(organization, locale).fullName : "";
  return { title: meta[locale].title, description: meta[locale].description(name) };
}
